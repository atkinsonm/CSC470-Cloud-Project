function addMessageChatHistory (username, isPresenter, message) {
	$("#chatroom").append($('<p>').text(message).addClass((isPresenter ? 'presenter' : 'attendee')).prepend($('<strong>').text(username+': ')));
}

var urlTokens = document.URL.split("/");
var roomID = urlTokens.pop();
var userType = urlTokens.pop();
var userIsPresenter;

if (userType === "p") 
	userIsPresenter = true;
else
	userIsPresenter = false;

var username = "Anonymous";

$(document).ready(function() {
	var socket = io();

	$("#title").text("Loading room info...");
	
	socket.on("connect", function () {
		if (!userIsPresenter) {
			username = prompt("Enter your name to join the room");
			if (username === null)
				username = "Anonymous";
		}
	});

	socket.emit("req-room-info", {roomID: roomID});

	socket.on("res-room-info", function(roomData) {
		$("#title").text("Welcome to " + roomData.name);
		if (userIsPresenter)
			username = roomData.instructorName;
		socket.emit("add-to-room", {roomID: roomID, username: username, userIsPresenter: userIsPresenter});
	});

	socket.on("update", function (data) {
		$("#attendees").empty();
		for (var i = 0; i < data.length; i++) {

			var user = data[i];
			var htmlStr = "<p>" + user.name + " - " + ((user.isPresenter) ? "presenter" : "attendee");

			if (user.handRaised)
				htmlStr = htmlStr + '<img src="/img/hand.png" height="16" width="16">';

			$("#attendees").append(htmlStr + "</p>");
		}
	});
	
	socket.on("update-file-list", function(response) {
		$("#fileList").empty();

		if (response.err) {
			var htmlContentFileString = "";
			for (var file in response.data) {
				var fileStr = JSON.stringify(response.data[file]);
				htmlContentFileString = htmlContentFileString + '<a target="_blank" href="' + fileStr.substring(fileStr.indexOf(',')+2, fileStr.length-2) + '">' + fileStr.substring(2, fileStr.indexOf(',')-1) + '</a><br/>';
			}
			$("#file-list").text("Error getting latest files");
		}
		else {
			for (var file in response.data) {
				var htmlContentFileString = '<a target="_blank" href="' + response.data[file][1] + '" download>' + response.data[file][0] + '</a><br>';
				$("#fileList").append(htmlContentFileString);
			}
		}
	});
	
	socket.on("update-main-file", function (response) {
		if( $("#presentation").is(':empty') ) {
			$("#presentation").append("<iframe id=\"presentationFile\" src=\"http://docs.google.com/gview?url=" + response.data + "&embedded=true\" style=\"display:block; width:100%; height:470px;\" frameborder=\"0\"></iframe>");
		}
	});

	socket.on("chat-history", function(data){
		if (data.messages) {
			for (var i = 0; i < data.messages.length; i++) {
				addMessageChatHistory(data.messages[i].username, data.messages[i].userIsPresenter, data.messages[i].message);
			};
		}
	});

	socket.on("chat-receive-message", function (data) {
		addMessageChatHistory(data.username, data.userIsPresenter, data.message);
	});

	socket.on("complete-file-upload", function (data) {

		// display the success message..
		$(".file-upload-message-wrapper p.message").text("File uploaded with success.");

		// cleaning the input file.
		$("#new-file").replaceWith($("#new-file").clone(true));
	});


	// adding a keypress event handler on chat textbox.
	$("#chat_box").keypress(function (e) {

		// check if user type enter.
		if (event.which == 13) {

			// parsing the room ID.
			var roomID = location.pathname.split("/")[3];

			var displayName;
			if ($("#anon-check").prop("checked"))
				displayName = "Anonymous";
			else
				displayName = username;

			// getting the message from the text box.
			var data = {
				roomID : roomID,
				username : displayName,
				userIsPresenter : userIsPresenter,
				message : $("#chat_box").val()
			};			

			// emmit the message
			socket.emit("chat-send-message", data);

			// upload the message for the user that send the message.
			//addMessageChatHistory(socket.id, data.message);
			
			// cleaning the message text box.
			$("#chat_box").val("");
		}
		var myDiv = document.getElementById("chatroom");
		myDiv.scrollTop = myDiv.scrollHeight;
	});

	$("#raisehand").on("click", function() {
		socket.emit("toggle-hand", {roomID: roomID});
		$(this).toggleClass("hand-raised");
	});

	// preparing the file reader and events.
	var FReader = new FileReader();

	FReader.onloadend = function(evt){

		// parsing the room ID.
		var roomID = location.pathname.split("/")[3];

		var file = $('#new-file')[0].files[0];

		var fileData = {
			'name' : file.name.split('.')[0],
			'extension' : file.name.split('.')[1],
			'data' : evt.target.result
		}

		// Emit a socket event to the server and send the input data
		socket.emit('upload-file', {roomID : roomID, file : fileData});
	}

	$("#upload-file-button").on("click", function(e) {
		$(".file-upload-message-wrapper p.message").text("");
		$("#new-file").click();
	});


	$("#new-file").on("change", function(e) {

		// getting the file object using jquery.
		var file = $('#new-file')[0].files[0];

		if (file != undefined) {
			FReader.readAsDataURL(file);	
		}
	});
});