$(document).ready(function() {

	var socketIOFileName = document.documentURI + "socket.io/socket.io.js";

	var socket = io();

	$.getScript(socketIOFileName, function() {

		var socket = io.connect(document.documentURI);

		$('#roomcreateform').submit(function(e) {

			e.preventDefault();

			// Create an array of email addresses from input string
			var emails = $('#emailsinput').val().split(',');

			// Trim whitespace from each string
			for (var count = 0; count < emails.length; count++) {
				emails[count] = emails[count].trim();
			}

			// A JS object that is sent to the server - packages the input data
			var inputData = {
				instructorName: $('#instructornameinput').val(),
				roomName: $('#roomnameinput').val(),
				emails: emails
			};

			// Emit a socket event to the server and send the input data
			socket.emit('create-room', inputData);

			// Unhide status message
			$("#creatingbucket").removeClass("hide");

		});

		$("#retryemail").on("click", function(){

			// Create an array of email addresses from input string
			var emails = $('#emailsinput').val().split(',');

			// Trim whitespace from each string
			for (var count = 0; count < emails.length; count++) {
				emails[count] = emails[count].trim();
			}

			var inputData = {
				instructorName: $('#instructornameinput').val(),
				roomName: $('#roomnameinput').val(),
				emails: emails
			};

			$("#sendingemails").text("Attempting to resend emails...");
			$("#retryemail").addClass("hide");

			socket.emit("resend-email", inputData);
		});

		socket.on("complete-bucket", function(response) {

			if (response.err) {
				$("#creatingbucket").text("Error creating bucket - could not create room. Try again later");
			}
			else {
				$("#creatingbucket").text("Bucket created successfully!");
				$("#addingdbitem").removeClass("hide");
				$("#sendingemails").removeClass("hide");
			}

		});

		socket.on("complete-db-add", function(response) {

			if (response.err) {
				$("#addingdbitem").text("Error creating dynamo entry - could not create room. Try again later");
			}
			else
				$("#addingdbitem").text("Dynamo entry created successfully!");

		});

		socket.on("complete-emails", function(response) {

			var emailLabel = $("#sendingemails");

			if (response.err) {
				emailLabel.text("Error sending emails: ensure you have typed in emails correctly");
				$("#retryemail").removeClass("hide");
			}
			else
				emailLabel.text("Successfully sent emails!");

		});


	});
});