var io = require('socket.io');
var ObjectId = require('mongoose').Types.ObjectId;
var User = require('../model/user');
var Message = require('../model/message');
var Group = require('../model/group');
var GroupSetting = require('../model/groupSetting');
var async = require('async');
var Q = require('q');

var sockets = {};

exports.setup = function(server) {
  io = io.listen(server, {origins: '*:*'});
  io.set('log level', 1);

  ///
  /// Setup Socket IO
  ///
  io.configure(function (){
    io.set('authorization', function (handshakeData, callback) {
      
      var token = handshakeData.query.token;
      if (!token) return callback(new Error('You must have a session token!'));

      User.findOneQ({accessToken: token}).then(function(user) {
	if (!user) throw 'Error';
	handshakeData.user = user;
	callback(null, true);
      })
	.fail(callback)
	.done();
    });
  });


  io.on('connection', function (socket) {

    var socketUser = socket.handshake.user;

    ///
    /// Store the socket for later so we can emit events to it.
    ///
    sockets[socketUser._id] = socket;

    ///
    /// Upon connecting, join every room that you should be in.
    ///
    socketUser.groups.forEach(function(group) {
      socket.join(group);
    });

    ///
    /// Default event to send back to the client to let them know they are all set
    ///
    socket.emit('connected', 'FastChat');

    /**
     * An event to make communication more dynamic. The typing event is immediatly fired
     * to other clients listening on the room to let them know when someone is typing.
     * Format:
     * {
     *   group: '342342343',
     *   typing: true[false]
     * }
     */
    socket.on('typing', function(typing) {
      var room = typing.group;
      var toSend = {
	'typing': (typing['typing'] ? true : false),
	'from': socketUser._id,
	'group': room
      };

      if (socketUser.hasGroup(room)) {
	socket.broadcast.to(room).emit('typing', toSend);
      }
    });

    /**
     * Called when a message is sent to a group. It will send it to all people in the group
     * and then save it for later retreiving, and then send a push notification to those
     * people who are not in the group.
     * Format:
     * {
     *   group: '342342343',
     *   text: 'This is a message!'
     * }
     */
    socket.on('message', function(message, fn) {
      var room = message.group;

      if (!message.text) {
	if (fn) {
	  fn({error: 'No Message Text'});
	}
	return;
      }

      if (!socketUser.hasGroup(room)) {
	if (fn) {
	   fn({error: 'Not Found'});
	}
	return;
      }

      var roomId = null;
      try {
	roomId = new ObjectId(room);
      } catch(err) {
	console.log('Tried to make the room ID and failed! ' + err);
	return;
      }

      ///
      /// Make a new message and add it to the group
      ///
      var mes = new Message({'from' : socketUser._id,
			     'group': roomId,
			     'text' : message.text,
			     'sent' : new Date(),
			     'hasMedia' : false
			    });
      ///
      /// Got the message id, let's send it back to the client.
      ///
      if (fn) fn({_id: mes._id});

      ///
      /// Broadcast the message to everyone in the group instantly
      ///
      socket.broadcast.to(room).emit('message', mes);

      ///
      /// Save the object we have, and add it to the group
      ///
      Group.findOneQ({'_id' : room}).then(function(group) {
	console.log('GROUP', group);
	if (!group) throw 'Not Found';

	group.messages.push(mes);
	group.lastMessage = mes._id;
	console.log('WHAT IS GOING ON HERE');
	return Q.all([group.saveQ(), mes.saveQ()]).then(function() {
	  console.log('THENNING');
	  return [group, mes];
	});
	
      }).spread(function(group, mes) {
	console.log('Spread', group, mes);
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

	return User.findQ({groups: { $in : [room] } }).then(function(users) {
	  return [group, message, users, roomUsers];
	});
      }).spread(function(group, message, users, roomUsers) {
	//refactor this?
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

	console.log('users NOT in room: ', usersNotInRoom);
	
	async.each(usersNotInRoom, function(user, callback) {

	  GroupSetting.findQ({'user': user._id}).then(function(gses) {
	    console.log('FOUND: ', gses);
	    var thisGs = GroupSetting.forGroup(gses, roomId);
	    console.log('THIS IS: ', thisGs);
	    if (!thisGs) return callback(); //should not happen

	    thisGs.unread++;

	    var text = mes.fromUser.username + '@' + group.name + ': ' + mes.text;
	    GroupSetting.totalUnread(gses).then(function(unread) {
	      user.push(group, text, unread, false);
	    })
	    callback();
	  });
	}, function(err) {
	  if( err ) {
	    console.log('Error Occured in sending push notifications: ' + err);
	  }
	});
      }).catch(function(err) {
	console.log('Duh:', err);
      });
    }); //On message

    socket.on('disconnect', function() {
      delete sockets[socketUser._id];
    }); //end on disconnect

  }); //end on Socket.io connection

};

/**
 * This method sends a message (@see message.js) to the group
 * from no one in particular. It will simply send it out to all members of the group.
 * This is useful for system events, such as someone joining or leaving the group.
 */
exports.messageToGroup = function(userId, groupId, event, message) {
  var userSocket = sockets[userId];

  if (userSocket) {
    userSocket.broadcast.to(groupId).emit(event, message);
  }
};

/**
 * Have the given user join the room. This is useful for if the user has been
 * invited to a group and they are currently chatting with people live. We will
 * add them to the group so they can start receiving messages without having
 * to disconnect and reconnect
 */
exports.joinGroup = function(groupId, userId) {
  var userSocket = sockets[userId];

  /// If this is false, then they were not on. Oh well.
  if (userSocket) {
    userSocket.join(groupId);
    return true;
  }
  return false;
};

exports.emitNewGroup = function(userId, group) {
  var userSocket = sockets[userId];

  if (userSocket) {
    userSocket.emit('new_group', group);
    return true;
  }
  return false;
};
