var io = require('socket.io');
var ObjectId = require('mongoose').Types.ObjectId;
var User = require('./model/user');
var Message = require('./model/message');
var Group = require('./model/group');
var GroupSetting = require('./model/groupSetting');
var async = require('async');

var sockets = {};

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

    sockets[socketUser._id] = socket;

    socketUser.groups.forEach(function(group) {
      socket.join(group);
    });

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
	///
	/// Make a new message and add it to the group
	///
	var mes = new Message({'from' : socketUser._id,
			       'group': new ObjectId(room),
			       'text' : message.text,
			       'sent' : new Date()
			      });
	
	///
	/// Broadcast the message to everyone in the group instantly
	///
	socket.broadcast.to(room).emit('message', mes);

	///
	/// Save the object we have, and add it to the group
	///
	mes.save(function(err) {
	  Group.findOne({'_id' : room}, function(err, group) {
	    if (group) {
	      group.messages.push(mes);
	      group.save();
	    }
	  });
	});

	///
	/// Add a temporary property 'fromUser' with the actual user object.
	///
	mes.fromUser = socketUser;

	///
	/// Let's send some notifications to all people not in the room.
	///
	var clients = io.sockets.clients(room);
	var roomUsers = []; //all currently in the room
	clients.forEach(function(client) {
	  roomUsers.push(client.handshake.user);
	});

	// Find all users who are in the group
	// Find Users who groups include 'room'
	User.find({groups: { $in : [room] } }, function(err, users) {

	  var usersNotInRoom = [];
	  for (var i = 0; i < users.length; i++) {
	    var foundUser = false;
	    for (var j = 0; j < roomUsers.length; j++) {
	      if (roomUsers[j]._id.equals(users[i]._id)) {
		foundUser = true;
		break;
	      }
	    }
	    if (!foundUser) usersNotInRoom.push(users[i]);
	  }

	  console.log('users NOT in room: ' + JSON.stringify(usersNotInRoom, null, 4));

	  ///
	  /// Okay, we have the users not in the room. Send a message to them.
	  ///
	  async.each(usersNotInRoom, function(user, callback) {
	    
	    GroupSetting.find({'user': user._id}, function(err, gses) {
	      console.log('FOUND: ' + JSON.stringify(gses, null, 4));

	      var thisGs = GroupSetting.forGroup(gses, new ObjectId(room));

	      console.log('THIS IS: ' + JSON.stringify(thisGs, null, 4));
	      if (thisGs) {
		thisGs.unread++;
		user.push(mes, GroupSetting.totalUnread(gses));
		thisGs.save(function(err) {
		  callback();
		});
	      } else {
		user.push(mes);
		callback();
	      }
	    });
	  }, function(err){
	    if( err ) {
	      console.log('Error Occured in sending push notifications: ' + err);
	    } 
	  });

	}); //Find all users in group

      } //If has group

    }); //On message


    socket.on('disconnect', function() {
      delete sockets[socketUser._id];
    });


  }); //end on Socket.io connection

};

// this is an actual objectId
exports.socketForId = function(userId) {
  return sockets[userId];
};
