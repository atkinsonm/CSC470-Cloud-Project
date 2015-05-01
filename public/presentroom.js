function addMessageChatHistory (username, isPresenter, message) {
	$("#chatroom").append($('<p>').text(message).prepend($('<strong>').text(username+(isPresenter ? '(presenter)' : '') + ': ')));
}

$(document).ready(function() {
	var socket = io();

	var urlTokens = document.URL.split("/");
	var roomID = urlTokens.pop();
	var userType = urlTokens.pop();
	var userIsPresenter;

	if (userType === "p") 
		userIsPresenter = true;
	else
		userIsPresenter = false;

	$("#title").text("Welcome to room " + roomID);

	var username;
	
	socket.on("connect", function () {
		username = prompt("Enter your name to join the room");
		socket.emit("add-to-room", {roomID: roomID, username: username, userIsPresenter: userIsPresenter, socketId: socket.id});
	});

	socket.on("update", function (data) {
		$("#attendees").empty();
		for (var i = 0; i < data.length; i++) {
			$("#attendees").append("<p>" + data[i].name + " - " + ((data[i].isPresenter) ? "presenter" : "attendee") + "</p>");
		}
	});

	socket.on("chat-receive-message", function (data) {
		addMessageChatHistory(data.user.name, data.user.isPresenter, data.message);
	});

	// adding a keypress event handler on chat textbox.
	$("#chat_box").keypress(function (e) {

		// check if user type enter.
		if (event.which == 13) {

			// parsing the room ID.
			var roomID = location.pathname.split("/")[3];

			// getting the message from the text box.
			var data = {
				"roomID" : roomID,
				"userID" : socket.id,
				"message" : $("#chat_box").val()
			};			

			// emmit the message
			socket.emit("chat-send-message", data);
			
			// cleaning the message text box.
			$("#chat_box").val("");
		}
	});
});