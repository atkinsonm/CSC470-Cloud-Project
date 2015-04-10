var bodyParser = require("body-parser"),
	aws = require("./awsClient.js")
	validator = require("./validator.js");

var app = require("express")();
var http = require("http").Server(app);
var io = require('socket.io')(http);

var clientDir = "/public"

// Allows server to read variables submitted in HTTP request
//app.use(bodyParser.json());

// Fetches content from the public directory and serves it to the requester
//app.use(express.static("public"));

http.listen(3000, function() {
	console.log("HTTP server listening on port 3000");
});

app.get('/', function (req, res) {
	res.sendFile(__dirname + clientDir + '/index.html');
});

app.get("/:fileName", function(req, res) {
	res.sendFile(__dirname + clientDir + "/" + req.params.fileName);
});

/*app.use(function (req, res) { 
	// If the public folder cannot satisfy the request, this function runs
	res.end("Invalid request: page not found");
});*/

io.on("connection", function(socket) {

	console.log("a user connected");

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

		var roomName = data.roomName;
		// Generate a random ID
		var roomID = aws.randID();

        // Populate email addresses from form data and send message to recipients
        var emailExists = true;
        emails = data.emails;

        // Validate the upload file.
        var file = validator.validateFile(data.file);
        debugger;
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
				socket.emit("complete-bucket", {err: err, data: data});

				if (file != false) {
					// Upload the file in the bucket.
					aws.uploadFileToS3Bucket(roomID, file);
				}
	
				// Continue with creating the room
				aws.addRoomToDB(roomName, roomID, addToDBCallback);

				aws.sendEmail(emails, instructor, awsFeedback);
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
        instructor = data.instructorName;
		aws.sendEmail(data.emails, instructor, awsFeedback);
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

});

