function addMessageChatHistory (username, isPresenter, message) {
	$("#chatroom").append($('<p>').text(message).prepend($('<strong>').text(username+(isPresenter ? '(presenter)' : '') + ': ')));
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
				htmlStr = htmlStr + '<img src="/img/hand.png" height="32" width="32">';

			$("#attendees").append(htmlStr + "</p>");
		}
	});
	
	socket.on("update-file-list", function(response) {

		if (response.err) {
			$("#file-list").text("Error getting latest files");
		}
		else {
			var htmlContentFileString;
			for (var file in resonse.data) {
				htmlContentFileString = htmlContentFileString.concat('<a href="' + response.data[file]['link'] + '>' + response.data[file]['name'] + '</a>');
			}													 
			$("#file-list").text(htmlContentFileString);
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

	// adding a keypress event handler on chat textbox.
	$("#chat_box").keypress(function (e) {

		// check if user type enter.
		if (event.which == 13) {

			// parsing the room ID.
			var roomID = location.pathname.split("/")[3];

			// getting the message from the text box.
			var data = {
				roomID : roomID,
				username : username,
				userIsPresenter : userIsPresenter,
				message : $("#chat_box").val()
			};			

			// emmit the message
			socket.emit("chat-send-message", data);

			// upload the message for the user that send the message.
			//addMessageChatHistory(socket.id, data.message);
			var myDiv = document.getElementById("chatroom");
			myDiv.scrollTop = myDiv.scrollHeight;
			// cleaning the message text box.
			$("#chat_box").val("");
		}
	});

	$("#raisehand").on("click", function() {
		socket.emit("toggle-hand", {roomID: roomID});
		$(this).toggleClass("hand-raised");
	});
});