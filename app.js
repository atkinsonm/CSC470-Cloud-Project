var connect = require("connect"),
	io = require("socket.io"),
	aws = require("./awsClient.js"),
	async = require("async"),
	wait = require("wait.for");

var app = connect()
	.use(connect.bodyParser()) // Allows server to read variables in a submitted form
	.use(connect.static("newroom")) // Fetches content from the newroom directory and serves it to the requester
	.use(function (req, res) { 
		// If the public folder cannot satisfy the request, this function runs
		res.end("Invalid request: page not found");
	})
	.listen(3000);

// Start listening for sockets
var socketListener = io.listen(app);

// All event listeners are to be placed within this callback function
socketListener.sockets.on("connection", function(socket) {

	// Listen for create-room event, which is called when the user clicks the submit button in the "Create A Room" section on the landing page
	socket.on("create-room", function(data) {

		// These console.log statements are for debugging purposes - they may be deleted later
		console.log("Creating room with instructor name " + data.instructorName + " room name " + data.roomName);
		console.log("Invitees:");
		for (var i = 0; i < data.emails.length; i++) {
			console.log("\t" + data.emails[i]);
		}

		var roomName = data.roomName;
		// Generate a random ID
		var roomID = aws.randID();
		var instructor = data.instructorName;
        var emails = data.emails;

		function testIDCallback(result) {
			if (result === false) {
				// The ID is not unique - generate another random ID then check if unique
				roomID = aws.randID();
				aws.testRoomID(roomID, testCallback);
			}
			else {
				// The ID is unique, create the room's bucket and entry in database
				console.log("Creating bucket with roomID " + roomID);
				aws.createBucket(roomID);
				aws.addRoomToDB(roomName, roomID);
				aws.sendEmail(emails, instructor);
			}
		}

		// Calls the test and will fire the testIDCallback when finished, resulting in bucket and DB entry creation
		aws.testRoomID(roomID, testIDCallback);
	});

});


