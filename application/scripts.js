(function() {
  
  App = {};
  App.socket = null;
  //App.IO_PORT = 40160;
  App.IO_URL = window.location.href;//'http://localhost:' + App.IO_PORT;

  ///////// ASSETS //////////
  App.knightImg = new Image;   
  App.castleImg = new Image; 
  App.soldierImg = new Image;
  App.castleImgCompleted = new Image;    
  App.img = new Image;
  


  ///////// Members //////////
  App.canvas = null;
  App.dragger = null;
  App.map = { pos:pos = {x:0, y:0}};
  App.bg = null;

  App.rightMButtonDown = false;
  App.dragstart = {x:0, y:0};

  App.playerID = 0;  
  App.players = new Array();
  App.castles = new Array();

  App.quiz = {};
  
  

  ///////// INITIALIZATION //////////

  $(document).ready(function(){
    document.oncontextmenu = function() {return false;};
    startInit();
  });


  function startInit() {
    loadAssets();
    $(App.img).ready(function(e) {
      // App.img is background/map and largest image --> when it has loaded we may proceed.
      assetsLoadSuccess();
    });    
  }

  ///////// INITIALIZATION : ASSETS & CONTINUATION //////////
  function loadAssets() {
    console.log("starting loading assets");
     
    App.knightImg.src = './img/knight.png';
    App.knightImg.width = 35;
    App.knightImg.height = 61;
	
  	App.soldierImg.src = './img/soldier.png';
  	App.soldierImg.width = 42;
  	App.soldierImg.height = 52;
    
    App.castleImgCompleted.src = './img/castle.png';
    App.castleImgCompleted.width = 32;
    App.castleImgCompleted.height = 32;
       
    App.castleImg.src = './img/castle-q.png';
    App.castleImg.width = 45;
    App.castleImg.height = 45;
    
    App.img.src = 'img/map.jpg';
  }
  function assetsLoadSuccess() {
    console.log("assets are loaded");
    initViews();
    initQuiz();
    initIO();  
    initEvents();
    App.canvas.update();
  }

  ///////// INITIALIZATION : VIEW & QUIZ //////////
  function initViews() {    

    App.canvas = new createjs.Stage("canvas");
    App.canvas.enableMouseOver(5);

    // the dragger is the container onto which all other objects are put.
    App.dragger = new createjs.Container();    
    App.canvas.addChild(App.dragger);
  
    // bg is the background/map
    App.bg = new createjs.Bitmap(App.img);
       
    App.dragger.addChild(App.bg);    
  }
  function initQuiz() {
    App.quiz.question = "Welcome!";
    App.quiz.scores = {};
    App.quiz.result = {};
    App.quiz.result.visible = false;
  }

  ///////// INITIALIZATION : SOCKET.IO //////////
  function initIO() {  
    App.socket = io.connect(App.IO_URL);
    initIO_players();
    initIO_movements();
    initIO_quests();
  }
  function initIO_players() {
    App.socket.on('joined', function(data) {      
      playerJoined(data.player, data.others, data.broadcast, data.castles);
    });

    App.socket.on('left', function(data) {
      playerLeft(data.id);
    });
  }
  function initIO_movements() {
    App.socket.on('mov', function(data) {
      otherPlayerMoved(data.player);
    });
  }
  function initIO_quests() {
    App.socket.on('ReplyQuest', function(data) {
      App.quiz.question = data.question;
      App.quiz.id = data.id;
      App.quiz.options = data.options;
      App.quiz.result.visible = false;
      updateScreen();
      $("#questionBox").show();
    });
  
    App.socket.on('ReplyQuestResult', function(data){      
      App.quiz.result.value = data.result;
      App.quiz.result.visible = true;
      updateScreen();
      if (data.result === "CORRECT") {
        completeQuest(data.q);
      }
    });
  
    App.socket.on('broadcastScore', function(data){
      App.quiz.scores = data.scores;
      console.log('Scores received from server '+ data.scores);
      updateScreen();
    });
  }

  ///////// INITIALIZATION : EVENTS //////////
  function initEvents() {    
    miscEvents();
    generalEvents();    
    movementEvents();
  } 
  function miscEvents() {
    // user clicks sendBtn to answer a specific question
    $("#sendBtn").on("click", function(){    
      var val = $('input[name="optionsRadios"]:checked').val();
      App.socket.emit('SendQuestAnswer',{pid: App.playerID, id: App.quiz.id, answer:val});
    });

    //when the user clicks away from a castle; then hide the quest box
    App.bg.addEventListener("click", function(e){ 
      $("#questionBox").hide();
    }); 
  }
  function generalEvents() {
    // new session / user --> ask their name
    $('canvas').ready(function() {    
      var name = null;
      while (name === null || name.length === 0) {
        name = prompt("Enter your name:");
      }
      App.socket.emit('conn',0, {name:name}); //new user
    });

    // user is disconnecting --> let the server know
    $(window).on('beforeunload', function(){
      App.socket.emit('close', App.playerID);
    });
  }
  function movementEvents() {
    movementEvents_map();
    //player movement
    App.bg.on("click", movePlayerTo);
  }
  function movementEvents_map() {
    // map movement
    App.dragger.on("mousedown",function(evt) {      
      if (evt.nativeEvent.which != 1) {
        App.dragstart.x = this.x - evt.stageX;
        App.dragstart.y = this.y - evt.stageY;
        App.rightMButtonDown = true;
      }
    });

    // map movement
    App.dragger.on("pressup",function(evt) {
      if (evt.nativeEvent.which != 1) {
        App.rightMButtonDown = false;
      }
    });

    // map movement
    App.dragger.on("pressmove",function(evt) {
      if (App.rightMButtonDown === true) {
        moveCameraTo(evt.stageX, evt.stageY);
      }
    });
  }



  ///////// CASTLES, QUESTS AND PRICESSES //////////

  function drawCastle(img, castle) {
    var castleBM = new createjs.Bitmap(img);
    castleBM.addEventListener("click", castle_onClick);  
    castleBM.x = castle.x;
    castleBM.y = castle.y;  
    castleBM.data = castle;
    App.dragger.addChild(castleBM);
    App.dragger.setChildIndex( castleBM, 1); //z-index (let knight be on top of castles)
    return castleBM;
  }

  function drawCastles() {
    console.log("castles:");
    console.log(App.castles);

    for (var ci in App.castles) {
      var castle = App.castles[ci];
      var castleBM = drawCastle(App.castleImg, castle);
      App.castles[ci].obj = castleBM;
    }
  }

  function completeQuest(questID) {
    for (var ci in App.castles) {
      var castle = App.castles[ci];
      if (castle.q === questID) {
        castle.completed = true;
        App.dragger.removeChild( castle.obj );
        var castleBM = drawCastle(App.castleImgCompleted, castle);
        App.castles[ci].obj = castleBM;
        return;
      }
    }
  }

  function castle_onClick(event) {
    console.log("castle clicked:");
    console.log(event.target.data);
    if (event.target.data.completed === false) {        
      var cx = event.target.data.x;
      var cy = event.target.data.y;
      var i = getPlayerIndex(App.playerID);
      var player = App.players[i];
      var px = player.pos.x;
      var py = player.pos.y;

      var radiusKnight = Math.sqrt(App.knightImg.width*App.knightImg.width + App.knightImg.height*App.knightImg.height)/2*1.3;
      var dt = Math.sqrt((cx-px)*(cx-px) + (cy-py)*(cy-py));
      if (dt < radiusKnight){
        App.socket.emit('GiveMeThisQuest', {id:App.playerID, q:event.target.data.q});
      } else {
        $("#questionBox").hide();
      }
    }
  }



  ///////// CAMERA //////////

  function moveCameraTo(stageX, stageY) {
    var dx = stageX + App.dragstart.x;
    var dy = stageY + App.dragstart.y;
    if (dx > 0) {        
      App.dragger.x = 0;
    } else if (dx < -App.canvas.canvas.width) {
      App.dragger.x = -App.canvas.canvas.width;
    } else {
      App.dragger.x = dx;
    }

    if (dy > 0) {
      App.dragger.y = 0;
    } else if (dy < -640) {
      App.dragger.y = -640;
    } else {
      App.dragger.y = dy;
    }
    
    App.map.pos.x = App.dragger.x;
    App.map.pos.y = App.dragger.y;

    App.canvas.update();  
  }

  ///////// DISPLAY & GUI //////////
  function updateScreen(){
    updateScreen_Scores();
    updateScreen_Quizes();
  }
  function updateScreen_Scores() {
	var mList = $('ul#currentPlayer');
    var cList = $('ul#otherPlayers');
    cList.empty();
	mList.empty();
	$('#playerCountTxt').text(App.players.length-1 + " player(s)");
    $.each(App.players, function(i) {
      var score = 0;
      for(var j=0;j<App.quiz.scores.length;j++){
        if(App.quiz.scores[j].id == App.players[i].id){
          score = App.quiz.scores[j].score;
        }
      }     
	  if(App.players[i].id == App.playerID){
		 mList.append(
        '<li class="list-group-item" style="background-color:#661a04;" id="player_'+ App.players[i].id +'">'+
        '<span class="badge"><span class="glyphicon glyphicon-tower" aria-hidden="true"></span>' + score + '</span>'
        + '<h3 class="ui-all" style="color:#ffffff;"><span class="glyphicon glyphicon-user" aria-hidden="true" style="margin-right:20px;"></span>'  +
        App.players[i].name + '</h3></li>');
	  }else{
		cList.append(
        '<li class="list-group-item" style="background-color:#661a04;" id="player_'+ App.players[i].id +'">'+
        '<span class="badge"><span class="glyphicon glyphicon-tower" aria-hidden="true"></span>' + score + '</span>'
        + '<h3 class="ui-all" style="color:#ffffff;"><span class="glyphicon glyphicon-user" aria-hidden="true" style="margin-right:20px;"></span>'  +
        App.players[i].name + '</h3></li>'); 
	  }
    });
  }
  function updateScreen_Quizes() {
    if(App.quiz.result.visible == true){
      $('#resultMessage').removeClass();
      $('#resultMessage').empty();
      $('#resultMessage').addClass("alert");
      if(App.quiz.result.value == "CORRECT"){
        $('#resultMessage').addClass("alert-success");
        $('#resultMessage').append('<span class="glyphicon glyphicon-ok" aria-hidden="true" style="margin-right:20px;"></span>Correct! You can proceed your adventure.');

      }else{
        $('#resultMessage').addClass("alert-danger");
        $('#resultMessage').append('<span class="glyphicon glyphicon-remove" aria-hidden="true" style="margin-right:20px;"></span>Wrong! Never give up!.');
      }
      $('#resultMessage').show();
    }else{
      $('#resultMessage').hide();
    }
    if(App.quiz.options){
      console.log("options: " + App.quiz.options);
      $('#optionlist').empty();
      for(var i=0;i<App.quiz.options.length;i++){
        $('#optionlist').append(
        '<div class="form-check">' +
         '<h3><input type="radio" class="form-check-input"  style="margin-left: 300px; margin-right:20px;" name="optionsRadios" id="answerOption' + i+1 + '" value="' + i + '">' +
         App.quiz.options[i] +
         '</h3></div>');
      }
    }
    
    $('#questionTitle').text(App.quiz.question);
  }


  ///////// PLAYERS & GAMEPLAY ////////// 

  function gameplayLoop(event) {
    if (App.players.length == 0) {
      return;
    }
    for (var i = 0; i < App.players.length; i++) {
      var player = App.players[i]; 

      var dx = player.target.x - player.pos.x;
      var dy = player.target.y - player.pos.y;
      if (player.target.d <= 0) {
        continue;
      }
      var d = Math.round(Math.sqrt((dx*dx+dy*dy)));
      if (d === 0) {
        continue;
      }
      dx = dx/d;
      dy = dy/d;
      player.pos.x += dx;
      player.pos.y += dy;
      if (player.circle !== undefined) {
        player.circle.x += dx;
        player.circle.y += dy;
      }
      player.knight.x += dx;
      player.knight.y += dy;

      if (player.target.d > 0) {
        player.target.d--;
      } else if (player.target.d < 0) {
        player.target.d++;
      }

      //App.socket.emit('updatePos', App.playerID, player.pos );
    }
    App.canvas.update(event); // important!!
  }   

  function drawPlayer(player) {
    console.log("drawing player:"); console.log(player);
	var knight;
	if(player.id == App.playerID){
		knight = new createjs.Bitmap(App.soldierImg);
	}else{
		knight = new createjs.Bitmap(App.knightImg); 
	}
    knight.addEventListener("click", knight_onClick);          
    knight.addEventListener("mouseover", knight_onHover);  
    knight.addEventListener("mouseout", knight_onHoverStop);          
    knight.x = player.pos.x;
    knight.y = player.pos.y;  
    knight.playerID = player.id;
    App.dragger.addChild(knight); 
    player.knight = knight;
    return player;
  }

  function knight_onClick(e) {  
    if (e.target.playerID !== App.playerID) {
      return; //
    }      
    var index = getPlayerIndex(App.playerID);
    if (index == null) {
      return;
    }
    var player = App.players[index];
    player.target.x = player.pos.x;
    player.target.y = player.pos.y;
    player.target.d = 0;
    App.socket.emit('mov', App.playerID, {x:player.target.x, y:player.target.y, d:0}); // stop moving 
  } 

  function knight_onHover(e) { 
    var id = e.target.playerID;
    var index = getPlayerIndex(id);
    if (index == null) {
      return;
    }
    var player = App.players[index];
    var li = $("#player_" + player.id);
    li.addClass("hoverKnight");
  }
  function knight_onHoverStop(e) { 
    var rem = $("li.hoverKnight");
    rem.removeClass("hoverKnight");
  } 

  function addAndDrawPlayerIfNotAdded(player) {
    var found = false;
    for (var j = 0; j < App.players.length; j++) {
      if (App.players[j].id === player.id) {
        found = true;
      }
    }
    if (found === false) {
      App.players.push(player);
      player = drawPlayer(player);
    }
  }

  function drawPlayers(players_) {         
    for(var i = 0; i < players_.length; i++) {
      var player = players_[i];              
      addAndDrawPlayerIfNotAdded(player);
    }
  }  

  function getPlayerIndex(id) {
    for(var i = 0; i < App.players.length; i++) {
      if (App.players[i].id == id) {
        return i;
      }
    }
    return null;
  }

  function movePlayerTo(e) {      
    if (e.nativeEvent.button != 0) {
      return; 
    }
    $("#questionBox").hide();  
    var index = getPlayerIndex(App.playerID);
    if (index == null) {
      return;
    }
    var player = App.players[index];

    console.log("move click");

    var relX = (-1*App.map.pos.x) + e.stageX;
    var dx = (-1*player.pos.x + relX)-(App.knightImg.width/2);

    //console.log("relX: " + relX);
    if (relX < App.knightImg.width/2) {
      dx +=  App.knightImg.width/2;
    } else if (relX > 1600-App.knightImg.width/2) {
      dx -=  App.knightImg.width/2;
    }

    var relY = (-1*App.map.pos.y) + e.stageY;
    var dy = (-1*player.pos.y + relY)-(App.knightImg.height/2);  

    //console.log("relY: " + relY);
    if (relY - App.knightImg.height/2 < -App.knightImg.height/2) {
      dy +=  App.knightImg.height/2;
    } else if (relY > 1036-App.knightImg.height/2) {
      dy -=  App.knightImg.height/2;
    }    

    dx = Math.round(dx);
    dy = Math.round(dy);

    player.target.x = player.pos.x + dx;
    player.target.y = player.pos.y + dy;    
    var d = Math.round(Math.sqrt((dx*dx+dy*dy)));
    player.target.d = d;

    console.log("emit mov: ");
    console.log( player.target );
    App.socket.emit('mov', App.playerID, player.target );

    App.players[index] = player;
  }

  function otherPlayerMoved(player) {
    var index = getPlayerIndex(player.id);
    if (index == null) {
      return;
    }
    var _player =  App.players[index];
    _player.target.x = player.target.x;
    _player.target.y = player.target.y;
    _player.target.d = player.target.d;
  }

  function playerJoined(player, others, isBroadcast, castles_) {
    if (isBroadcast === true) {
      // another player joined :

      console.log("A new player joined: ");
      console.log(player);

      addAndDrawPlayerIfNotAdded(player);
      updateScreen();
    } else {
      // we've joined successfully:

      App.castles = castles_;     
      drawCastles();

      App.playerID = player.id;           
      console.log("Welcome " + player.id);

      moveCameraTo(-player.pos.x + App.canvas.canvas.width/2, -player.pos.y + App.canvas.canvas.height/2);
      
      drawPlayers(others);   
      updateScreen();   

      console.log("Online players are:");
      console.log(App.players);                

      createjs.Ticker.setInterval(15);
      createjs.Ticker.on("tick", gameplayLoop);
    } 
    
    App.canvas.update();
  } 

  function playerLeft(id) {
    var index = getPlayerIndex(id);
    if (index == null) {
      return;
    }
    console.log("left player:");
    console.log( App.players[index] );
    App.dragger.removeChild( App.players[index].knight );
    console.log(App.dragger);
    App.players.splice(index, 1);
    updateScreen();
  }


}).call(this);