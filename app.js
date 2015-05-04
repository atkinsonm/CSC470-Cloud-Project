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
Array.prototype.roomIndexByID = function(targetID) {
	var resIndex = -1;
	for (var i = 0; i < this.length; i++) {
		if (targetID === this[i].id)
			resIndex = i;
	}
	return resIndex;
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
		res.sendFile(__dirname + clientDir + "/presenterroom.html");
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

        // Countdown for number of Queue creation fails.
        var queueFails = 5;

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

				// Continue with creating the chat queue
				aws.createQueueSQS(roomID, createQueueCallback);

				aws.sendEmail(emails, instructor, roomID, awsFeedback, externalIP);

				aws.publish;

				// Add the newly created room's ID to the list of active rooms
				//activeRooms.push(roomID);

				var newRoom = new Room(roomID, roomName);
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

		function createQueueCallback(err, data) {
			if (err && queueFails > 0) {
				queueFails--;
	
                console.log("Retrying create a chat queue for " + roomName + " and " + roomID);
				
				// Retry the database add
				aws.createQueueSQS(roomID, createQueueCallback);
			}
			else {
				socket.emit("complete-queue-creation", {err: err, data: data});
			}
		}

		// Calls the test and will fire the testIDCallback (along with the rest of the callbacks) when finished, resulting in bucket, DB entry creation, and sending of emails
		aws.testRoomID(roomID, testIDCallback);
	});

	socket.on("resend-email", function(data) {

		aws.sendEmail(data.emails, data.instructorName, data.roomID, awsFeedback, externalIP);
	});


	socket.on("add-to-room", function(data) {
		var user = new User(data.username, data.userIsPresenter);
		console.log("A new " + ((user.isPresenter) ? "presenter" : "attendee") + " named " + user.name + " entered the room " + data.roomID);
		socket.join(data.roomID);
		var currentRoom = activeRooms[activeRooms.roomIndexByID(data.roomID)];
		currentRoom.userList.push(user);
		console.log("pushing update event to room " + data.roomID + " and user list " + currentRoom.userList);
		// Emits event to all in the new user's room including the new user
		io.in(data.roomID).emit("update", currentRoom.userList);
		var roomID = data.roomID;
		
		function listObjectsCallback(err, data) {
			var files = new Array();
			if (err) {
				console.log("Error retrieving files.");
			} else {
				if (data.length > 1 || data[0] != null) {
					console.log("Updating file list for room " + roomID);
					for (var file in data) {
						var name = data[file]["Key"];
						var link = "http://s3.amazonaws.com/tcnj-csc470-nodejs-" + roomID + "/" + name;
						if (name != null) files.push([name,link]);
					}
					console.log(files);
					// Post the data to the GUI
					socket.emit("update-file-list", {err: err, data: files});
				} else {
					console.log("No files found for room " + roomID);
					socket.emit("updata-file-list", {err: err, data: "No files to view"});
				}
			}
		}

		aws.listObjects(roomID, listObjectsCallback);

		// Emit a event to recover all chat history for the user.
		aws.recoverChatHistorySQS(data.roomID, recoverChatHistorySQSCallback);

		function recoverChatHistorySQSCallback(err, data) {
			socket.emit("chat-history", {messages: currentRoom.chatHistory});	
		}
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

		// getting the current room.
		var currentRoom = activeRooms[activeRooms.roomIndexByID(roomID)];

		// getting the current users in the room.
		var currentRoomUsers = currentRoom.userList;

		// recovering the user object.
		var user;
		for (var i = 0; i < currentRoomUsers.length; i++) {

			if (currentRoomUsers[i].socketId == data.userID) {
				user = currentRoomUsers[i];
				break;
			}
		};

		// adding the user object to the data object that will be send to client.
		data.user = user;
		data.sentTime = (new Date).getTime();

		console.log('User named ' + user.name + ' in the room' + roomID + ' sent a message on chat.');

		// broadcasting the message.
		io.in(roomID).emit("chat-receive-message", data);

		// send the message to queue to store a chat history.
		aws.logChatHistory(roomID, data);

		if (!currentRoom.chatHistory)
			currentRoom.chatHistory = new Array();

		currentRoom.chatHistory.push(data);
	});
});

function Room(id, name) {
	this.id = id;
	this.name = name;
	this.userList = [];
}

function User(name, isPresenter, socketId) {
	this.name = name;
	this.isPresenter = isPresenter;
	this.socketId = socketId;
}