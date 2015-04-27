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

// This route takes the user to the room
app.get("/room/:userType/:roomID", function (req, res) {

	// The user type is p if the user is a presenter or a if the user is an attendee
	if (activeRooms.indexOf(req.params.roomID) > -1 && req.params.userType === "p") {
		// A presenter has logged in
		res.sendFile(__dirname + clientDir + "/presenterroom.html");
	}
	else if (activeRooms.indexOf(req.params.roomID) > -1 && req.params.userType === "a") {
		// An attendee has logged in
		res.sendFile(__dirname + clientDir + "/presenterroom.html");
	}
	else {
		res.send("<h1>Room Not Found</h1>");
	}
});

io.on("connection", function(socket) {

    // Declare these globally so they can be used by the create-room and resend-email listeners
    var instructor;
    var emails;
    
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
        
        instructor = data.instructorName;
        emails = data.emails;

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
				activeRooms.push(roomID);
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
		var roomID = data.roomID;
		socket.room = roomID;
		console.log("A new user entered the room " + roomID);
		socket.join(roomID);
		socket.broadcast.to(roomID).emit("update", {message: "A new user has connected"});
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

		console.log('Chat message received on room: ' + roomID);

		// broadcasting the message.
		io.in(roomID).emit("chat-receive-message", data);
	});
});

