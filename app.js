'use strict';

var bodyParser = require("body-parser"),
	aws = require("./awsClient.js"),
	validator = require("./validator.js"),
	getIP = require('external-ip')();

// Sets up express server to accept HTTP 
var app = require("express")();
var http = require("http").Server(app);
var io = require('socket.io')(http);

var clientDir = "/public"

http.listen(3000, function() {
	console.log("HTTP server listening on port 3000");
});

// Serve up the index.html file as the home page
app.get("/", function (req, res) {
	res.sendFile(__dirname + clientDir + '/index.html');
});

// Serve up all other files through the public directory
app.get("/:fileName", function (req, res) {
	res.sendFile(__dirname + clientDir + "/" + req.params.fileName);
});

app.get("/:directory/:fileName", function(req, res) {
	res.sendFile(__dirname + clientDir + "/" + req.params.directory + "/" + req.params.fileName);
});

// Get the public IP address of the Node server
var externalIP = "";
getIP(function (err, ip) {
	if (err) {
		throw err;
	}
	externalIP = ip;
	console.log("The server's IP address is " + externalIP);
});

// An array of active room IDs
var activeRooms = [];

// This function is called by the array of rooms - returns -1 if the room ID is not found - returns the index of the room in the array if the room ID is found
activeRooms.roomIndexByID = function(targetID) {
	var resIndex = -1;
	for (var i = 0; i < this.length; i++) {
		if (targetID === this[i].id)
			resIndex = i;
	}
	return resIndex;
}

// This function is called by the array of rooms - the user list of each room is checked for the user with the socket ID string specified by the paramater, and this user is deleted from the room's user list
activeRooms.deleteUserBySocketID = function(socketID) {
	for (var roomInd = 0; roomInd < this.length; roomInd++) {
		for (var userInd = 0; userInd < this[roomInd].userList.length; userInd++) {
			if (this[roomInd].userList[userInd].socketID === socketID) {
				this[roomInd].userList.splice(userInd, 1);
				// Return the room ID if the user was found
				return this[roomInd].id;
			}
		}
	}
	// If the user was not found, return undefined
	return undefined;
}

// Toggles the handRaised value of the user in room roomID and with a socketID of socketID
activeRooms.toggleHand = function(roomID, socketID) {
	debugger;
	for (var roomInd = 0; roomInd < this.length; roomInd++) {
		if (roomID === this[roomInd].id) {
			for (var userInd = 0; userInd < this[roomInd].userList.length; userInd++) {
				var user = this[roomInd].userList[userInd];
				if (user.socketID === socketID) {
					user.handRaised ? user.handRaised = false : user.handRaised = true;
					// Returns the room's index in the array if the user was found and the handRaise value was toggled
					return roomInd;
				}
			}
		}
	}
	// Returns undefined if the user could not be found and the hand was not toggled
	return undefined;
}

// This route takes the user to the room
app.get("/room/:userType/:roomID", function (req, res) {
	// The user type is p if the user is a presenter or a if the user is an attendee
	if (activeRooms.roomIndexByID(req.params.roomID) > -1 && req.params.userType === "p") {
		// A presenter has logged in
		res.sendFile(__dirname + clientDir + "/presenterroom.html");
	}
	else if (activeRooms.roomIndexByID(req.params.roomID) > -1 && req.params.userType === "a") {
		// An attendee has logged in
		res.sendFile(__dirname + clientDir + "/attendeeroom.html");
	}
	else {
		res.send("<h1>Room Not Found</h1>");
	}
});


io.on("connection", function(socket) {

	function awsFeedback(err, data, socketEvent) {
    	// Emits a socket event and passes the error and data objects that will come from the AWS service call
    	socket.emit(socketEvent, {err: err, data: data});
	}

	// Listen for create-room event, which is called when the user clicks the submit button in the "Create A Room" section on the landing page
	socket.on("create-room", function(data) {

		// These console.log statements are for debugging purposes - they may be deleted later
		console.log("Creating room with instructor name " + data.instructorName + " room name " + data.roomName);
    
        var roomName = data.roomName;
        // Create random ID
        var roomID = aws.randID();

        var instructor = data.instructorName;
        var emails = data.emails;

        // Populate email addresses from form data and send message to recipients
        var emailExists = true;
        emails = data.emails;

        // Validate the upload file.
        var file = validator.validateFile(data.file);

        if (file == false) {
        	console.log("No file uploaded.");
        }

        // Countdown for number of bucket creation fails - after this many fails, the server will give up trying to create a room
        var bucketFails = 5;

        // Countdown for number of DynamoDB add item fails
        var dynamoFails = 5;

        // This function will be provided a boolean of whether or not a unique ID has been generated
		function testIDCallback(result) {
			if (result === false) {
				// The ID is not unique - generate another random ID then check if unique
                roomID = aws.randID();
				aws.testRoomID(roomID, testIDCallback);
			}
			else {
				// The ID is unique, create the room's bucket and entry in database
				console.log("Creating room with ID " + roomID);
				aws.createBucket(roomID, createBucketCallback);
			}
		}
	
		function createBucketCallback(err, data) {
	
			if (err && bucketFails > 0) {
				// If the bucket could not be created, it is assumed that the bucket name is already taken
				// Generate a new room ID, test it, then try creating a bucket again
				console.log("Could not create room with ID " + roomID);
				bucketFails--;
				roomID = aws.randID();
				aws.testRoomID(roomID, testIDCallback);
			} 
			else if (bucketFails > 0) {
				// Bucket was created successfully, emit event to socket to signal success
				socket.emit("complete-bucket", {err: err, data: data, roomID: roomID});

				if (file != false) {
					// Upload the file in the bucket.
					aws.uploadFileToS3Bucket(roomID, file);
				}
	
				// Continue with creating the room
				aws.addRoomToDB(roomName, roomID, addToDBCallback);

				aws.sendEmail(emails, instructor, roomID, awsFeedback, externalIP);

				// Add the newly created room's ID to the list of active rooms
				//activeRooms.push(roomID);

				var newRoom = new Room(roomID, roomName, instructor);
				activeRooms.push(newRoom);
			}
			else
				socket.emit("complete-bucket", {err: err, data: data});
		}
	
		function addToDBCallback(err, data) {
			if (err && dynamoFails > 0) {
				dynamoFails--;
	
                console.log("Retrying " + roomName + " and " + roomID);
				// Retry the database add
				aws.addRoomToDB(roomName, roomID, addToDBCallback);
			}
			else {
				socket.emit("complete-db-add", {err: err, data: data});
			}
		}

		// Calls the test and will fire the testIDCallback (along with the rest of the callbacks) when finished, resulting in bucket, DB entry creation, and sending of emails
		aws.testRoomID(roomID, testIDCallback);
	});

	socket.on("resend-email", function(data) {

		aws.sendEmail(data.emails, data.instructorName, data.roomID, awsFeedback, externalIP);
	});


	socket.on("add-to-room", function(data) {
		var user = new User(data.username, data.userIsPresenter, socket.id);
		console.log("A new " + ((user.isPresenter) ? "presenter" : "attendee") + " named " + user.name + " entered the room " + data.roomID);
		socket.join(data.roomID);
		var currentRoom = activeRooms[activeRooms.roomIndexByID(data.roomID)];
		currentRoom.userList.push(user);
		console.log("pushing update event to room " + data.roomID + " and user list " + currentRoom.userList);
		// Emits event to all in the new user's room including the new user
		io.in(data.roomID).emit("update", currentRoom.userList);
	});
    
    // Listen for delete-room event, which is called when the instructor leaves the room
	socket.on("delete-room", function(data) {
        var roomName = data.roomName;
        var roomID = data.roomID;
        
        // Countdown for number of bucket creation fails - after this many fails, the server will give up trying to create a room
        var bucketFails = 5;

        // Countdown for number of DynamoDB add item fails
        var dynamoFails = 5;
        
        function deleteBucketCallback(err, data) {
	
			if (err && bucketFails > 0) {
				// If the bucket could not be deleted, try again
				bucketFails--;
				aws.deleteBucket(roomID, deleteBucketCallback);
			}
			else socket.emit("delete-bucket", {err: err, data: data});
		}
        
        function deleteFromDBCallback(err, data) {
			if (err && dynamoFails > 0) {
				dynamoFails--;
	
                console.log("Retrying " + roomName + " and " + roomID);
				// Retry the database delete
				aws.deleteRoomFromDB(roomName, roomID, deleteFromDBCallback);  
			}
			else {
				socket.emit("delete-db-add", {err: err, data: data});
			}
		}
        
        aws.deleteBucket(roomID, deleteBucketCallback);
        aws.deleteRoomFromDB(roomName, roomID, deleteFromDBCallback);       
        
    });
	
	// Listen for a chat message and broadcast for all users in the room.
	socket.on("chat-send-message", function(data) {
		var roomID = data.roomID;

		console.log('Chat message received on room: ' + data.roomID);

		// broadcasting the message.
		io.in(roomID).emit("chat-receive-message", data);
	});

	socket.on("req-room-info", function(data) {
		var roomData = activeRooms[activeRooms.roomIndexByID(data.roomID)];
		socket.emit("res-room-info", roomData);
	});

	socket.on("toggle-hand", function(data) {
		debugger;
		var roomIndex = activeRooms.toggleHand(data.roomID, socket.id);
		debugger;
		if (typeof(roomIndex) !== "undefined")
			io.in(data.roomID).emit("update", activeRooms[roomIndex].userList);
	});

	socket.on('disconnect', function () {
		// Gets the ID of the room that the user has been deleted from, if a user has been deleted
		var discRoomID = activeRooms.deleteUserBySocketID(socket.id);
		debugger;

		// If the discRoomID is not undefined, a user has been removed from a room
		if (typeof(discRoomID) !== "undefined") {
			console.log("user has disconnected from room " + discRoomID);
			// Update all sockets in the room with the new user list
			var currentRoom = activeRooms[activeRooms.roomIndexByID(discRoomID)];
			io.in(discRoomID).emit("update", currentRoom.userList);
		}
	});
});

function Room(id, name, instructorName) {
	this.id = id;
	this.name = name;
	this.userList = [];
	this.instructorName = instructorName;
}

function User(name, isPresenter, socketID) {
	this.name = name;
	this.isPresenter = isPresenter;
	this.socketID = socketID;
	this.handRaised = false;
}