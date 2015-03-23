var connect = require('connect');

var app = connect()
	.use(connect.bodyParser()) // Allows server to read variables in a submitted form
	.use(connect.static('newroom')) // Fetches content from the newroom directory and serves it to the requester
	.use(function (req, res) { 
		// If the public folder cannot satisfy the request, this function runs
		res.end("Invalid request: page not found");
	})
	.listen(3000);
