// Importing modules needed
var io = require('socket.io'),
  connect = require('connect'),
  chatter = require('chatter'),
  serveStatic = require('serve-static');

// Associates this Node.js socket app with the HTML documents in the public directory and listen on port 3000
var app = connect().use(connect.static('public')).listen(3000);
var webFront = connect().use(serveStatic(__dirname)).listen(80);
console.log("\nSimple HTML server running on port 80.");
var chat_room = io.listen(app);

chatter.set_sockets(chat_room.sockets);

chat_room.sockets.on('connection', function (socket) {
  chatter.connect_chatter({
    socket: socket,
    username: socket.id
  });
});
