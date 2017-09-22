
var tester = require('tap');
var port = 40160;
var URL = "http://localhost:" + port;
var should = require('should');
var io = require('socket.io-client');

tester.test("2 players connect and disconnect from server", function(t) {	
	console.log(URL);
	var client1 = io.connect( URL );
	var name1 = "nicola";
	var client2 = io.connect( URL );
	var name2 = "ilja";
	var numUsers = 0;
	var clientIDs = new Array();

	client1.emit('conn',0, {name:name1}); //new user
	client2.emit('conn',0, {name:name2}); //new user

	client1.on('joined', function(data){
		numUsers+=1;
		clientIDs.push(data.player.id);
		if(numUsers == 2){
			t.ok(1, "2 users are connected");
			
			client1.emit('close', clientIDs[0]);
			client2.emit('close', clientIDs[1]);
			
			client1.disconnect();
			client2.disconnect();
			t.end();
		}
	});
});

tester.test("player ask for quest : q1", function(t) {
	var client1 = io.connect( URL );
	var name1 = "nicola";
	var player = null;

	// 1. join server
	client1.emit('conn',0, {name:name1}); //new user

	client1.on('joined', function(data){
		player = data.player;
		// 2. ask for a quest
		client1.emit('GiveMeThisQuest', {id:player.id, q:"q1"});
	});

	// 3. validate if quest is correct
	client1.on('ReplyQuest', function(data) {
		console.log(data.question);
		t.equal(data.question , "5 + 7 = ?");
		client1.emit('close', player.id);
		client1.disconnect();
		t.end();
	});
	
});

tester.test("player send answer for quest : q1", function(t) {
	var client1 = io.connect( URL );
	var name1 = "nicola";
	var player = null;

	// 1. join server
	client1.emit('conn',0, {name:name1}); //new user

	client1.on('joined', function(data){
		player = data.player;
		// 2. send quest answer
		client1.emit('SendQuestAnswer',{pid: player.id, id: "q1", answer: "2"});
	});

	// 3. validate reqult
	client1.on('ReplyQuestResult', function(data){      
		t.equal(data.result, "CORRECT");
		client1.emit('close', player.id);
		client1.disconnect();
		t.end();
    });

});

//




