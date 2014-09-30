var io = require('socket.io');
var ObjectId = require('mongoose').Types.ObjectId;
var User = require('../model/user');
var Message = require('../model/message');
var Group = require('../model/group');
var GroupSetting = require('../model/groupSetting');
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
      console.log('Received Message: ', message);
      var room = message.group;

      if (!message.text && fn) {
	return fn({error: 'No Message Text'});
      }

      console.log('Testing Room', socketUser);
      if (socketUser.hasGroup(room)) {
	console.log('User has group.');

	var roomId = null;
	try {
	  roomId = new ObjectId(room);
	} catch(err) {
	  console.log('Tried to make the room ID and failed! ' + err);
	  return;
	}

	console.log('Room ID?', roomId);

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

	
	console.log(mes);

	///
	/// Broadcast the message to everyone in the group instantly
	///
	socket.broadcast.to(room).emit('message', mes);

	///
	/// Save the object we have, and add it to the group
	///
	Group.findOne({'_id' : room}, function(err, group) {
	  if (group) {
	    group.messages.push(mes);
	    group.lastMessage = mes._id;
	    group.save();
	    mes.save();

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

		  var thisGs = GroupSetting.forGroup(gses, roomId);

		  console.log('THIS IS: ' + JSON.stringify(thisGs, null, 4));
		  if (thisGs) {
		    thisGs.unread++;

		    var text = mes.fromUser.username + '@' + group.name + ': ' + mes.text;
		    // THIS IS BROKEN IT RETURNS A PROMISEEEEE
		    user.push(group, text, GroupSetting.totalUnread(gses), false);
		    thisGs.save(function(err) {
		      callback();
		    });
		  } else {
		    console.log('This should never be called. ');
		    console.trace();
		    callback();
		  }
		});
	      }, function(err){
		if( err ) {
		  console.log('Error Occured in sending push notifications: ' + err);
		}
	      });

	    }); //Find all users in group

	  }
	});

      } //If has group
      else {
	if (fn) {
	  fn({error: 'User has no such group!'});
	}
      }

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
