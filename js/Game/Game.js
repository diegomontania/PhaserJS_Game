//criando um 'namespace' para o projeto
var TheLittleGuy = TheLittleGuy || {};

TheLittleGuy.Game = function(){};

TheLittleGuy.Game.prototype = {

    //funciona como um 'start'
    create: function(){
        //registrando uma tecla        propriedade do phase da tecla desejada
        this.spaceKey = this.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

        //criado cenário via tiled
        this.map = this.game.add.tilemap('level1');
        this.map.addTilesetImage('tiles', 'gameTiles'); //primeiro parametro, nome do tiled, segundo, chave associada a ele
        this.backgroundlayer = this.map.createLayer('backgroundLayer'); //criando as layers utilizadas no tiled
        this.blockobjectsBottonLayerBehind_LittleDetailsedLayer = this.map.createLayer('objectsBottonLayerBehind_LittleDetails');
        this.objectsBottonLayer = this.map.createLayer('objectsBottonLayer');
        this.blockedLayer = this.map.createLayer('blockedLayer');
        this.objectsTopLayer = this.map.createLayer('objectsTopLayer');

        //colisao entre              1 e 3k de tiles
        this.map.setCollisionBetween(1, 3000, true, 'blockedLayer'); //colisao com a layer do tiled de 'chao' 

        //resizes the game world to match the layer dimensions
        this.backgroundlayer.resizeWorld();

        //criação de 'itens' que possuem colisão 'overlap' via tiled
        this.createItems();

        //criando texto de pontos
        this.textPoints = this.add.text(580, 543, "TEXTO TEXTO", {
                font: "30px Arial",
                fill: "#ffffff",
                align: "center"
        });
        this.textPoints.anchor.setTo(0, 0); //ancorando texto
        
        //#####criando objetos que colidem diretamente pelo phaser, sem tiled#####\\

        //criando grupo de estrelas
        this.stars = this.add.group();
        this.stars.enableBody = true;
        for(var i = 0; i < 12; i++){
            var star = this.stars.create (i * 70, 0, 'star');     
            star.body.gravity.y = 1 + Math.random() * 10;    //gravidade atuando randomicamente para cada estrela
            star.body.bounce.y = 0.7 + Math.random() * 0.2;  //estrelas quicando no chão randomicamente
        }

        //criando grupo de espetos
        this.spikes = this.add.group();
        this.spikes.enableBody = true;
        this.spikes.x = 160;
        this.spikes.y = 500;
        for(var i = 0; i < 8; i++){     //criando 'spike' a partir do grupo já instanciado com fisica
            var spike = this.spikes.create(16 * i, 0, 'spike'); 
            spike.body.immovable = true;  
        }   

        //criando o jogador com todos os seus atributos, animações, barra de vida e etc
        this.createPlayer();
        this.createLifeBar();
        
        //carregando sons e efeitos de som do jogo
        this.loadingSounds();
        
        //detectando as setas do teclado
        cursors = this.input.keyboard.createCursorKeys();  
    },

    update: function(){
        //escrevendo e mostrando os pontos
        this.textPoints.text = "Score : " + this.pointsPlayer;

        //fazendo player andar e parar
        this.movimentPlayer();        

        //fazendo player Pular
        this.detectFloorPlayer();

        //fazendo jogo terminar
        this.gameWin();

        //fazendo barra de vida
        this.lifeBar();
        
        //metodos de colisão
        this.collidingObjects();
        this.overlapingObjects();

        //debug phaser
        //this.debugPhaser();
    },

    //#region METODOS PLAYER
    createPlayer: function(){
        //variaveis do player
        this.jumpForce = 250;
        this.velocityPlayer = 150;
        this.gravityForce = 450;
        this.lifePlayer = 100;
        this.pointsPlayer = 0;
        this.pointsMax = 120;
        this.damage = 0; //inicialmente comecará com 0

        //criando jogador
        this.player = this.add.sprite(10, 150, 'dude');
        this.physics.arcade.enable(this.player); //habilitando a fisica ao objeto do jogador
        this.player.body.bounce.y = 0.1;         //adicionando propriedades de fisica ao jogador (bounce vai de 0 a 1)
        this.player.body.gravity.y = this.gravityForce;
        this.player.body.collideWorldBounds = true; //colidindo com as bordas da tela

        /***qualquer objeto que tenha que ter animação, deverá ser carregado como SPRITESHEET em preload.js***/  
        //adicionando animações ao jogador, esquerda e direita
        //               nome animacao / todos os frames dessa animação / velocidade animação / loop sim ou não
        this.player.animations.add('left', [0, 1, 2, 3], 10, true);
        this.player.animations.add('right', [5, 6, 7, 8], 10, true);
    },

    createLifeBar: function(){
        //criando e posicionando barra de vida do jogador e hud com o rosto do personagem
        this.add.sprite(20, 545, 'dude_hud'); //rosto do personagem
        this.healthBar = this.add.sprite(52, 550, 'lifeBar'); //criando aqui
        this.healthBar.scale.setTo(0.4, 0.6);
        this.healthBar.anchor.y = 0.0;
        this.healthBar.animations.add('changeColorBar', [0, 1, 2, 3], 1, true);
    },

    movimentPlayer: function(){
        if(cursors.left.isDown){
            this.player.body.velocity.x =- this.velocityPlayer;  //velocidade
            this.player.animations.play('left');            //tocando animação
        } 
        else if (cursors.right.isDown){
            this.player.body.velocity.x = this.velocityPlayer;
            this.player.animations.play('right');
        }
        else{  
            this.player.body.velocity.x = 0; //fazendo player parar, caso nenhuma tecla esteja sendo pressionada
            this.player.animations.stop();   //parando animação
            this.player.frame = 4;           //mudando o frame para 'parado' que é o frame 4
        }
    },

    detectFloorPlayer: function(){
        //variavel para detectar se o jogador colidiu com o chão, para então habilitar o pulo
        //deteção da colisao com o chão antes do pulo, para evitar possiveis problemas com o mesmo
        var hitGround = this.physics.arcade.collide(this.player, this.blockedLayer);    

        //se apertar o de espaço e estiver tocando no chão e em uma plataforma, pule
        if(this.spaceKey.isDown && this.player.body.onFloor() && hitGround){
            this.player.body.velocity.y =- this.jumpForce;  
            this.jummpEffect.volume = 0.2;
            this.jummpEffect.play(); //tocando som de pulo
        }

        /* FUTURO METODO DE PULO (JOGABILIDADE INTERESSANTE)
        futuramente fazer o player pular nas paredes? ao invés de utilizar "hitground" 
        utilizar talvez "hitwall" e criar uma layer no tiled para paredes que podem ser utilizadas como jump
        if(this.spaceKey.isDown && hitGround){
            this.player.body.velocity.y =- this.jumpForce;  
            this.jummpEffect.volume = 0.2;
            this.jummpEffect.play(); //tocando som de pulo
            //this.player.frame = 1;  //troca frame pulo, fazer melhor para esquerda e direita
        }

        */
    },

    damagePlayer: function(){
        this.damage = 10; //dano a ser recebido (temporario)
        this.lifePlayer = this.lifePlayer - this.damage;
        this.damageEffect.play();

        //evitando bug que a barra fique com valor negativo
        if(this.lifePlayer <= 0){
            this.lifePlayer = 0;
            this.player.kill();

            //chamando metodo de game over após 2 segundos da morte do little guy
            this.time.events.add(Phaser.Timer.SECOND * 2, this.gameOver, this);
            this.backgroundMusic.pause();
        }
    },

    //barra de vida do jogador irá diminuir conforme a sua vida ou seja tomando dano
    lifeBar: function(){
        this.healthBar.width = this.lifePlayer;

        //mudando cor da barra conforme o hp
        if (this.lifePlayer <= 40){
            this.healthBar.frame = 3;
        } else if (this.lifePlayer <= 60){
            this.healthBar.frame = 2;
        } else if (this.lifePlayer <= 80){
            this.healthBar.frame = 1;
        }
    },
    //#endregion
    
    //#region METODOS DE AUDIO / SOM
    loadingSounds: function(){
        //criando os sons carregados anteriomente
        this.starEffect = this.game.add.audio('starEffect');
        this.backgroundMusic = this.game.add.audio('backgroundMusic');
        this.jummpEffect = this.game.add.audio('jumpEffect');
        this.damageEffect = this.game.add.audio('damageEffect');

        //tocando som de fundo
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = 0.3;
        this.backgroundMusic.play();
    },
    //#endregion

    //#region METODOS DE TRANSIÇÃO DE CENAS
    gameWin: function(){
        //se fizer o máximo de pontos
        if(this.pointsPlayer >= this.pointsMax){
            this.backgroundMusic.pause();      // parando música para evitar bug de audio repetido
            this.game.state.start('GameWin'); //voltando para o menu inicial ao ganhar (provisório)
        }
    },

    gameOver: function(){
        this.game.state.start('GameOver'); //perdeu
    },
    //#endregion
    
    //#region METODOS DIVERSOS
    collidingObjects: function(){
       //colidindo objetos (batendo / encostando) (estrela e chão)
       this.physics.arcade.collide(this.stars, this.blockedLayer);
       this.physics.arcade.collide(this.player, this.spikes, this.damagePlayer, null, this);
    },

    overlapingObjects: function(){
        //verificando se o player está sobrepondo (passando por cima) da estrela e chamando funcao 'collectStar' que vai fazer o jogador coletar a estrela
        this.physics.arcade.overlap(this.player, this.stars, this.collectStar, null, this);
        this.physics.arcade.overlap(this.player, this.items, this.collectItem, null, this); //colidindo com objetos do tiled
    },

    collectStar: function(player, star){
        //deletando objeto a ser coletado
        star.kill();
        this.starEffect.play(); //tocando efeito de som
        this.pointsPlayer = this.pointsPlayer + 10; //adicionando pontos
    },

    collectItem: function(player, collectable) {
        console.log('yummy!');
    
        //remove sprite
        collectable.destroy();
    },
    
    debugPhaser: function(){
        //debug
        this.blockedLayer.debug = true;
        this.game.debug.bodyInfo(this.player, 10, 10);
    },
    //#endregion

    //#region METODOS DO TILED PARA FUNCIONAMENTO DO MESMO

    //#####Itens#####
    //criando itens do tiled
    createItems: function() {
        //create items
        this.items = this.game.add.group();
        this.items.enableBody = true;
        var item;    
        result = this.findObjectsByType('item', this.map, 'objectsLayer');
        result.forEach(function(element){
          this.createFromTiledObject(element, this.items);
        }, this);
    },

    //adicionar uma nova função aqui de 'createXXX' para um novo item futuro.

    //funcao auto-explicativa
    //find objects in a Tiled layer that containt a property called "type" equal to a certain value
    findObjectsByType: function(type, map, layer) {
        var result = new Array();
        map.objects[layer].forEach(function(element){
        if(element.properties.type === type) {
            //Phaser uses top left, Tiled bottom left so we have to adjust the y position
            //also keep in mind that the cup images are a bit smaller than the tile which is 16x16
            //so they might not be placed in the exact pixel position as in Tiled
            element.y -= map.tileHeight;
            result.push(element);
        }      
        });
        return result;
    },

    //create a sprite from an object
    createFromTiledObject: function(element, group) {
        var sprite = group.create(element.x, element.y, element.properties.sprite);
        //copy all properties to the sprite
        Object.keys(element.properties).forEach(function(key){
            sprite[key] = element.properties[key];
        });
    },
    //#endregion
}