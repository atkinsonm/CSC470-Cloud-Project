var inputData = {};

function utf8_to_b64(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
}

function b64_to_utf8(str) {
    return decodeURIComponent(escape(window.atob(str)));
}

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
			inputData = {
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
			}

			// reading the file.
			FReader.readAsDataURL(file);	
		});
	});
});