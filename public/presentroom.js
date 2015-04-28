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
		socket.emit("add-to-room", {roomID: roomID, username: username, userIsPresenter: userIsPresenter});
	});

	socket.on("update", function (data) {
		$("#attendees").empty();
		for (var i = 0; i < data.length; i++) {
			$("#attendees").append("<p>" + data[i].name + " - " + ((data[i].isPresenter) ? "presenter" : "attendee") + "</p>");
		}
	});
});