# groep-4

In this university project we had to develop a distributed application in a group of 2 people.
My partner and I have chosen to develop a basic multiplayer game where a player has to traverse a given area and complete quests.
The purpose of the project was to primarily get familiar with NodeJS and utilize other technologies such as JavaScript, HTML5/CSS3.

##Requirements
Docker

##Installation
Run the following commands in order:
> docker build -t groep-4-app https://github.ugent.be/gdtProject2016/groep-4.git#:application

> docker run -p 40160:3000 -it --rm --name groep-4-running-app groep-4-app

Then visit http://localhost:40160/ using your favorite (HTML5 supported) web browser, enjoy!

####Installation details
The game is hosted on a Docker container, and it listens to port 3000 internally. By default we cannot access port 3000 outside the container, that's why we are forwarding port 40160 on the host machine, to port 3000 on the container. We also have to expose port 3000.

If you wish to change the server port (3000), then you have to do so in the "docker run..." command and these files: "application/server.js" and "application/Dockerfile".

If you wish to change the client-port (40160) then you only have to do so in the "docker run ..." command and the "test/index.js" file.

###Unit testing
Before running the tests, make sure the server is up and running.

The tests located in "test/index.js" are using localhost:40160 by default, if you use any other address/port, then adjust it to run the tests.

Run the following commands in order:
> docker build -t groep-4-test https://github.ugent.be/gdtProject2016/groep-4.git#:test

> docker run -it --net=host --rm --name groep-4-running-test groep-4-test

Note! please notice the "--net=host" parameter. In some cases the test-container was unable to connect to the Docker-host at location localhost:40160.

##Gameplay
The game "Empires of Knowledge (beta)" is inspired by multiplayer strategy games such as the "Age of Empires".
Battle against players using your agility as well as your knowledge. Each player starts at a random location on the map. Your goal is to travel to every single castle and complete each quest as quickly as possible. Speed is of the essence, the winner gets to marry the most gorgeous princess Fabiola.

Good luck to you!

![alt text](https://github.ugent.be/gdtProject2016/groep-4/blob/master/application/docs/Knipselb.PNG "Preview")


###Basic controls
Left mouse click: move your character

Right mouse hold & drag: browsing the map

Animated gif:

![alt text](https://github.ugent.be/gdtProject2016/groep-4/blob/master/application/docs/anim.gif "Preview")


###Client-Server Communications
![alt text](https://github.ugent.be/gdtProject2016/groep-4/blob/master/application/docs/sequenceDiagram.PNG "Preview")


###Beta version drawbacks
At this stage the game does contain some bugs.

To enjoy the best gaming experience, make sure all players have joined the game prior to making any moves.

Secondly, make sure all web browser windows are visible, thus not minimized. When a browser is minimized then the game is being paused automatically; when the window is maximized again then the positions of other players MAY be inaccurate (we did our very best to avoid this).

The winner is the player who has completed all the quests first. Unfortunately, at this stage, he does not receive a notification that he is the winner -- this feature will be implemented in the near future.

Another feature that should be added is a queue: a game may only start once a specific number of players have connected (e.g. 10 players). At this stage players can join and leave the game as they please.

####Misc.
Useful docker commands to clear unused images and stopped containers:
> docker rm $(docker ps -a -q)

> docker rmi $(docker images | grep "^<none>" | awk '{ print $3 }')
# group4-distributed-project
