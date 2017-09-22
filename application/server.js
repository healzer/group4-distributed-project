

var express = require('express');
var app = express().use(express.static(__dirname + '/')) ;
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var PORT = 3000;
server.listen(PORT);

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

var mapX = 1600;
var mapY = 1036;
var knightWidth = 96;
var knightHeight = 168;
var players = new Array();
//	player {id:id, pos:{x, y},target:{x, y, d}, }


//predefined castle positions; these will be send to user upon connect
var castles = [{q:"q1", x:240, y:100, completed:false}
			, {q:"q2", x:300, y:200, completed:false}
			, { q:"q3", x:500, y:250, completed:false}
			, { q:"q4", x:100, y:200, completed:false}  //scotland
			, { q:"q5", x:210, y:400, completed:false}  //benelux
			, { q:"q6", x:300, y:390, completed:false}
			, { q:"q7", x:410, y:320, completed:false}
			, { q:"q8", x:150, y:460, completed:false}
			, { q:"q9", x:250, y:310, completed:false}
			];
var scores = []; //[ { pid:user_id, score:user_score }]
var questCompletion = []; // [ {id:user_id, qs["q1","q2",]}, ]

var fs = require('fs');
var Questions = [ ];
fs.readFile('./questions.json', 'utf8', function (err, data) {
    if(err) throw err;
    var jsonData = JSON.parse(data);
	for(var q in jsonData){
		Questions.push( {id: q, question: jsonData[q].question, options:jsonData[q].options, answer:jsonData[q].answer});
	}
});


function getStartPosition() {
	var x = Math.round(Math.random() * (mapX-knightWidth*2)) ;
	var	y = Math.round(Math.random() * (mapY-knightHeight*2)) ;

	//x = Math.round(Math.random() *(200));//remove ::debugging
	//y = Math.round(Math.random() *(200));//remove ::debugging

	return {x:x,y:y};
}

function genUserID() {	
	var uid = (new Date()).getTime();
	var isUnique = true;

	for (var u in players) {
		if (players[u].id === uid) {
			isUnique = false;
		}
	}

	while (isUnique===false) {
		return genUserID();
	}
	return uid;
}
function addNewPlayer(data) {
	var player = {id: genUserID()};
	var pos = getStartPosition();
	player.pos = pos;	
	player.name = data.name;
	player.target = pos;
	player.target.d = 0;
	players.push(player);
	return player;
}

function getPlayerIndex(id) {
	for(var i = 0; i < players.length; i++) {
		if (players[i].id == id) {
			return i;
		}
	}
	return null;
}


function getQuestCompletion(id) {
	var q = null;
	for (var i = 0; i < questCompletion.length; i++) {
		if (questCompletion[i].id == id) {
			q = questCompletion[i].qs;
			break;
		}
	}
	if (q == null){return null;}

	return q;
}


function sendQuest(data, socket){
	var pid = data.id;
	var limit = Questions.length;
	var qid = data.q;

	var qd = null; //obtain completionList based on userId
	var index = getQuestCompletion(pid);
	if (index != null) {
		qd = questCompletion[index];
	}

	//check if this quest already on completionList
	if(qd != null) {
		for(var i=0;i<qd.length;i++){
			if(qd[i] === qid){				
				return; //this quest has already been completed previously
			}
		}
	}

	//let us find the index of the quest based on castleID
	index = 0;
	for(var i=0;i<Questions.length;i++) {
		if(Questions[i].id == qid) {
			index = i;
			break;
		}
	}

	socket.emit('ReplyQuest', {
		id: Questions[index].id,
		question: Questions[index].question,
		options: Questions[index].options });
	
}

function ReplyQuestResult(socket, result, qid){
	socket.emit('ReplyQuestResult', {result:result, q:qid});
}

function prepareCastles(id) {
	var ct = castles;
	var comp = getQuestCompletion(id);
	if (comp == null) {
		return ct;
	}
	for (var c in ct) {
		for (var d in comp) {
			if (ct[c].q === comp[d]) {
				ct[c].completed = true;
			}
		}
	}
	//let user know which quests he already completed
	return ct;
}

function notify_PlayerJoined(player, socket) {
	socket.broadcast.emit('joined', {player:player, others:null, broadcast:true});
	console.log(players);
	socket.emit('joined', {
			player:player,
			others:players,
			broadcast:false,
			castles:prepareCastles(player.id)
		});
}
function notify_PlayerMoved(player, socket) {
	socket.broadcast.emit('mov', {player:player});
}
function notify_PlayerLeft(player, socket) {
	socket.broadcast.emit('left', {id:player.id});
}
function notify_Scoreboard(player,socket,scores) {
	socket.emit('broadcastScore', {scores:scores});
	socket.broadcast.emit('broadcastScore', {scores:scores});
}
function notify_PlayerNewPos(player, socket) {
	socket.broadcast.emit('updatePos', {id:player.id, pos:player.pos});
}
io.on('connection', function(socket) {
    socket.on('conn', function(id, data) {   
    	var player = addNewPlayer(data);
    	console.log("player joined: " + player.id + "\tname: " + player.name);
    	notify_PlayerJoined(player, socket);
    	console.log("Online players: " + players.length);
		notify_Scoreboard(player, socket, scores);
    });

	
	socket.on('close', function(id){
		console.log('player disconneted with id ' + id);
		for(var i = 0; i < players.length; i++) {
			if (players[i].id == id) {
				notify_PlayerLeft(players[i], socket);
				var qid = getQuestCompletion(id);
				questCompletion.splice(qid, 1);
				players.splice(i, 1);				
				break;
			}
		}
		console.log("Online players: " + players.length);
	});
	
	//client wants to try this quest
	socket.on('GiveMeThisQuest', function(data){
		console.log('received request for question');
		sendQuest(data, socket);
	});
	
	//receiving answer for a quest from a client
	socket.on('SendQuestAnswer', function(data){
		console.log(data);
		var pid = data.pid;
		var qid = data.id;
		var answer = data.answer;
		console.log(pid + " sent answer: " + answer + " for question " + qid);
		
		
		
		var correct = false;
		for(var i=0;i<Questions.length;i++){
			if(Questions[i].id == qid){
				if(Questions[i].answer === answer){
					correct=true;
				}
			}
		}
		if(correct){
			var qd = null;
			console.log('correct answer mate');
			for (var i = 0; i < questCompletion.length; i++) {
				if (questCompletion[i].id == pid) {
					qd = questCompletion[i].qs;
					break;
				}
			}
			if(qd == null){
				questCompletion.push( {id:pid, qs:[qid]} );
			}else{
				var check = false;
				for(var i=0;i<qd.length;i++){
					if(qd[i] == qid){
						check=true;
					}
				}
				if( !check ){
					qd.push(qid);
				}
			}
			ReplyQuestResult(socket, "CORRECT", qid);
			var exists =false;
			if(scores.length==0){
				scores.push({id:pid, score:1});
			}else{
				for(var i=0;i<scores.length;i++){
					if(scores[i].id == pid){
						scores[i].score += 1;
						exists=true;
						break;
					}
				}
				if(!exists){
					scores.push({id:pid, score:1});
				}
			}
			console.log(scores);
			notify_Scoreboard(pid, socket,scores);
			console.log(questCompletion);
			
		}else{
			console.log('Wrong answer bro.');
			ReplyQuestResult(socket, "WRONG", qid);
		}
		//send result to client
	});


	socket.on('mov', function(id, data) {
    	var index = getPlayerIndex(id);
    	if (index == null) {
    		return;
    	}
    	console.log("player moving to:");
    	console.log(data);
    	player = players[index];
    	player.target.x = data.x;
    	player.target.y = data.y;
    	player.target.d = data.d;    	
    	players[index] = player;
    	console.log(player);
    	notify_PlayerMoved(player, socket);
    });

    socket.on('updatePos', function(id, pos) {
    	var index = getPlayerIndex(id);
    	if (index == null) {
    		return;
    	}
    	console.log("player new pos:");
    	console.log(pos);
    	player = players[index];
    	player.pos = pos;
    	players[index] = player;
    });
});

