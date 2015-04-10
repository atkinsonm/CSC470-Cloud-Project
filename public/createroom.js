var inputData = {};

function utf8_to_b64(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
}

function b64_to_utf8(str) {
    return decodeURIComponent(escape(window.atob(str)));
}

$(document).ready(function() {

	var socketIOFileName = document.documentURI + "socket.io/socket.io.js";

	var socket = io();

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

		// getting the file object using jquery.
		var file = $('#presentationfile')[0].files[0];

		// preparing the file reader and events.
		var FReader = new FileReader();

		FReader.onloadend = function(evt){
			inputData.file = {
				'name' : file.name.split('.')[0],
				'extension' : file.name.split('.')[1],
				'data' : evt.target.result
			}

			// Emit a socket event to the server and send the input data
			socket.emit('create-room', inputData);

			// Unhide status message
			$("#creatingbucket").removeClass("hide");
		}

		// reading the file.
		if (file != undefined) {
			FReader.readAsDataURL(file);	
		}
		else {
			// Emit a socket event to the server and send the input data
			socket.emit('create-room', inputData);	

			// Unhide status message
			$("#creatingbucket").removeClass("hide");
		}
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