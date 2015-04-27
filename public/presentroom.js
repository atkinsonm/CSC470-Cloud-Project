function addMessageChatHistory (username, message) {
	$("#chatroom").append($('<p>').text(message).prepend($('<strong>').text(username+': ')));
}

$(document).ready(function() {
	var socket = io();

	var urlTokens = document.URL.split("/");
	var roomID = urlTokens.pop();
	var userType = urlTokens.pop();
	var userTypeStr;

	if (userType === "p") 
		userTypeStr = "presenter";
	else
		userTypeStr = "attendee";

	$("#title").text("Welcome to room " + roomID);
	
	socket.on("connect", function () {
		socket.emit("add-to-room", {roomID: roomID});
	});

	socket.on("update", function (data) {
		$("#attendees").append("<p>A new person has joined</p>");
	});

	socket.on("chat-receive-message", function (data) {
		addMessageChatHistory(data.userID, data.message);
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

			// upload the message for the user that send the message.
			addMessageChatHistory(socket.id, data.message);
			
			// cleaning the message text box.
			$("#chat_box").val("");
		}
	});
});