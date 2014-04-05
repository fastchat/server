var io = require('socket.io');
var ObjectId = require('mongoose').Types.ObjectId;
var User = require('./model/user');
var Message = require('./model/message');
var Group = require('./model/group');

exports.setup = function(server) {
  io = io.listen(server, {origins: '*:*'});


  ///
  /// Setup Socket IO
  ///
  io.configure(function (){
    io.set('authorization', function (handshakeData, callback) {
      console.log('AUTHORIZED ACTIVATED: ' + JSON.stringify(handshakeData, null, 4));
      // findDatabyip is an async example function
      var token = handshakeData.query.token;

      if (!token) return callback(new Error('You must have a session token!'));
      
      console.log('TokeN???? ' + token);
      User.findOne( { accessToken: token }, function (err, usr) {
	console.log('Found: ' + err + ' Usr: ' + usr);
	
	if (err) return callback(err);

	if (usr) {
	  console.log('SUCCESSFUL SOCKET AUTH');
	  handshakeData.user = usr;
	  callback(null, true);
	} else {
          callback(null, false);
	}
      });
    });
  });


  io.on('connection', function (socket) {

    var socketUser = socket.handshake.user;
    for (var i = 0; i < socketUser.groups.length; i++) {
      socket.join(socketUser.groups[i]); //Group ID
    }
    socket.emit('connected', 'FastChat');

    socket.on('typing', function(typing) {
      var room = message.group;
      var toSend = { 'typing': typing.typing == true, 'from': socketUser._id};
      if (socketUser.hasGroup(room)) {
	socket.broadcast.to(room).emit('typing', toSend);
      }
    });

    socket.on('message', function(message) {
      console.log('Received Message: ' + JSON.stringify(message, null, 4));
      var room = message.group;

      if (socketUser.hasGroup(room)) {
	var createdMessage = {
	  text: message.text,
	  from: socketUser._id,
	  group: room,
	  sent: new Date()
	};

	socket.broadcast.to(room).emit('message', createdMessage);

	///
	/// Make a new message and add it to the group
	///
	var aMessage = new Message({'from' : socketUser._id,
				    'group': new ObjectId(room),
				    'text' : message.text,
				    'sent' : new Date()
				   });

	aMessage.save(function(err) {
	  Group.findOne({'_id' : room}, function(err, group) {
	    if (group) {
	      group.messages.push(aMessage);
	      group.save();
	    }
	  });
	});


	var clients = io.sockets.clients(room);
	var roomUsers = [];
	for (var i = 0; i < clients.length; i++) {
	  roomUsers.push(clients[i].handshake.user);
	}

	for (var j = 0; j < roomUsers.length; j++) {
	  if (roomUsers[j]._id.equals(socketUser._id) ) {
	    message.fromUser = roomUsers[j];
	    break;
	  }
	}   

	// Find all users who are in the group
	// Find Users who groups include 'room'
	User.find({groups: { $in : [room] } }, function(err, users) {

	  var usersNotInRoom = [];
	  for (var i = 0; i < users.length; i++) {
	    var foundUser = false;
	    for (var j = 0; j < roomUsers.length; j++) {
	      if (roomUsers[j]._id.equals(users[i]._id)) {
		foundUser = true;
	      }
	    }
	    if (!foundUser) usersNotInRoom.push(users[i]);
	  }

	  console.log('users NOT in room: ' + JSON.stringify(usersNotInRoom, null, 4));
	  /// Okay, we have the users not in the room.
	  // SEnd a message to them.
	  for (var i = 0; i < usersNotInRoom.length; i++) {
	    var aUserNotInRoom = usersNotInRoom[i];
	    aUserNotInRoom.unreadCount++;
	    aUserNotInRoom.push(message);
	    aUserNotInRoom.save();
	  }
	});

      }

    });

    

    socket.on('disconnect', function() {
      // do something with notifications?
    })
    
  });




};
