$(document).ready(function() {

	var socketIOFileName = document.documentURI + "socket.io/socket.io.js";

	$.getScript(socketIOFileName, function() {

		var socket = io.connect(document.documentURI);

		$('#createsubmit').on('click', function() {

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
		});
	});
});