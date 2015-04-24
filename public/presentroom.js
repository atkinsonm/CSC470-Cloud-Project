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
});