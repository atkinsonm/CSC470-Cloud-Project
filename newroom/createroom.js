var AWS = require('aws-sdk');
var roomname;
var roomnamejoin;
var instructorname;
var emails;
var upload;
var attendeename;
var create = document.getElementById("createsubmit");
var join = document.getElementById("joinsubmit");

create.onclick = function(){
	roomname = document.getElementById("roomnameinput");
	instructorname = document.getElementById("instructornameinput");
	emails = document.getElementById("emailsinput");
	upload = document.getElementById("presentationfile");
}

join.onclick = function(){
	attendeename = document.getElementById("attendeenameinput");
	roomnamejoin = document.getElementById("roomnameattendeeinput");
}

var emaillist = emails.split(",");


