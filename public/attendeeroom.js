function addMessageChatHistory (username, isPresenter, message) {
	$("#chatroom").append($('<p>').text(message).prepend($('<strong>').text(username+(isPresenter ? '(presenter)' : '') + ': ')));
}

$(document).ready(function() {
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

			// upload the message for the user that send the message.
			//addMessageChatHistory(socket.id, data.message);
			
			// cleaning the message text box.
			$("#chat_box").val("");
		}
	});
});