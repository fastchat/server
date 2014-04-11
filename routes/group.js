var User = require('../model/user');
var Group = require('../model/group');
var Message = require('../model/message');
var async = require('async');
var ObjectId = require('mongoose').Types.ObjectId; 
var io = require('../socket');
var GroupSetting = require('../model/groupSetting');

exports.getGroups = function(req, res) {
  var usr = req.user;

  GroupSetting.find({'user': usr._id}, function(err, gses) {
    Group.find( { 'members' : usr._id }, '_id members leftMembers name')
      .populate('members', 'username')
      .populate('leftMembers', 'username')
      .populate('lastMessage')
      .exec(function(err, groups) {
	if (err) res.send(500, {'error' : 'There was an error getting groups!'});

	res.send(groups);
      });
  });

};

exports.createGroup = function(req, res) {
  var usr = req.user;

  console.log('BODY: ' + JSON.stringify(req.body, null, 4));
  
  var members = req.body.members;
  if (!members || !(members instanceof Array) || members.length == 0) {
    return res.send(400, {'error': 'The "members" value must be a valid array of length 1!'});
  }

  var message = req.body.text;
  if (!message) {
    return res.send(400, {'error': 'You must send a message with the new group!'});
  }

  var cb = function(err, group) {
    if (err) return res.send(400, {'error': err});
    res.send(201, group);
  };

  var name = req.body.name;

  for (var i = 0; i < members.length; i++) {
    members[i] = members[i].toLowerCase();
  }

  User.find({'username': { $in: members } }, function(err, users) {
    if (err || users.length == 0) {
      return res.send(400, {'error': 'No users were found with those usernames!'});
    }

    console.log('Found Users: ' + JSON.stringify(users, null, 4));

    var otherMembers = [];
    users.forEach(function(user) {
      if (!user._id.equals(usr._id)) {
	otherMembers.push(user);
      }
    });

    if (otherMembers.length === 0) {
      return res.send(400, {'error': 'You can\'t make a group with only yourself!'});
    }

    newGroup(name, otherMembers, message, usr, cb);
  });

};

function newGroup(groupName, members, message, creator, cb) {

  members.push(creator);

  Group.newGroup({'name': groupName, 'members': members}, function(err, group) {
    if (err) return cb(err);
    
    var aMessage = new Message({'from' : creator._id,
				'group': group._id,
				'text' : message,
				'sent' : new Date()
			       });

    aMessage.save(function(err) {
      group.messages.push(aMessage._id);
      group.save();

      ///
      /// Emit a new message to socket users
      ///
      var usersNotOn = [];
      members.forEach(function(user) {
	if ( !user._id.equals(creator._id) ) { //Don't emit to creator
	  var didSend = io.emitNewGroup(user._id, group);
	  if (!didSend) {
	    usersNotOn.push(user);
	  }
	}
      });
      
      var text = creator.username + '@' + group.name + ': ' + message;
      usersNotOn.forEach(function(user) {
	user.push(group, text, null, false);
      });

      cb(null, group);
    });
    
  });
};

// PUT /group/:id/leave
exports.leaveGroup = function(req, res) {

  var idParam = req.params.id.toString();
  var groupId = new ObjectId(idParam);
  var user = req.user;

  // To leave a group, we must:
  // put them in the leftMembers array in the group
  // remove them from the members array in the group
  // add the group to leftGroups in the profile
  // remove the group from groups in the profile

  Group.findOne( { _id : groupId }, function(err, group) {
    if (!group) {
      return res.send(404, {'error':'Not Found!'});
    }

    var index = group.members.indexOfEquals(user._id);
    if (index === -1) {
      return res.send(404, {'error':'Not Found!'});
    }


    async.parallel([
      function(callback) {
	// update group
	group.members.splice(index, 1);
	group.leftMembers.push(user._id);
	group.save(function(err) {
	  callback(err);
	});
      },
      function(callback){
	// Update profile
	var groupIndex = user.groups.indexOfEquals(groupId);
	console.log('Index2: ' + groupIndex);
	if (groupIndex > -1) {
	  user.groups.splice(groupIndex, 1);
	  user.leftGroups.push(groupId);
	  user.save(function(err) {
	    callback(err);
	  });
	} else {
	  callback();
	}
      },
      function(callback) {
	// send a message to the group notifying them that the person left
	var aMessage = new Message({'from' : null,
				    'group': group._id,
				    'text' : user.username + ' has left the group.',
				    'sent' : new Date(),
				    'type' : 'system'
				   });
	aMessage.save();
	io.messageToGroup(group._id, 'member_left', aMessage);
	callback();
      }
    ],
    // optional callback
    function(err, results) {
      if (err) return res.send(400, {'error':err});
      
      res.send(200, {});
    });
  });
};

exports.changeSettings = function(req, res) {
  console.log('HERE');
  var name = req.body.name;
  var idParam = req.params.id.toString();
  var groupId = new ObjectId(idParam);
  var user = req.user;

  if (!user.hasGroup(groupId)) {
    return res.send(404, {'error' : 'Group was not found!'});
  }

  Group.findOne( { _id : groupId }, function(err, group) {
    if (err || !group) return res.send(404, {'error' : 'Group was not found!'});

    group.name = name;
    group.save(function(err) {

      var aMessage = new Message({'from' : null,
				  'group': group._id,
				  'text' : 'Group is now called ' + name,
				  'sent' : new Date(),
				  'type' : 'system'
				 });
      aMessage.save();
      io.messageToGroup(group._id, 'group_name', aMessage);

      res.send(200, {});
    });
  });
};

exports.add = function(req, res) {
  console.log('Invite Body: ' + JSON.stringify(req.body, null, 4));

  var idParam = req.params.id.toString();
  var invites = req.body.invitees;
  var groupId = new ObjectId(idParam);

  if ( !(invites instanceof Array) ) {
    return res.json(400, {'error': 'invitees must be an Array!'});
  }

  if (invites.length == 0 ) {
    return res.json(200, {});
  }

  Group.findOne( { _id : groupId }, function(err, group) {
    if (err || !group) return res.send(404, {'error' : 'Not Found!'});

    console.log('Found Group: ' + JSON.stringify(group, null, 4));
    async.each(invites, function(username, cb) {
      User.findOne( { 'username': username.toLowerCase() }, function (err, usr) {

	if (!usr) {
	  return cb();
	}

	///
	/// Don't add to the group if the user has left the group
	///
	var index = usr.leftGroups.indexOfEquals(group._id);
	var index2 = usr.groups.indexOfEquals(group._id);

	if (index !== -1 || index2 !== -1) {
	  return cb('A user who left cannot be readded!');
	}

	///
	/// Each member in the group gets a GroupSetting object
	///
	var setting = new GroupSetting({
	  'user': usr._id,
	  'group': group._id
	});

	setting.save(function(err) {
	  console.log('Error: '+ err);
	});
	usr.groupSettings.push(setting._id);

	///
	/// Don't invite, just add straight to group
	///
	group.members.push(usr._id);

	group.save(function (err) {
	  if (err) return cb(err);

	  usr.groups.push(group._id);
	  usr.save( function (err) {
	    if (err) return cb(err);

	    var aMessage = new Message({'from' : null,
					'group': group._id,
					'text' : usr.username + ' has joined the group.',
					'sent' : new Date(),
					'type' : 'system'
				       });
	    aMessage.save();
	    io.messageToGroup(group._id, 'member_joined', aMessage);
	    var didSend = io.emitNewGroup(usr._id, group);
	    if (!didSend) {
	      usr.push(null, 'You have been added to the group: ' + group.name, null, false);
	    }
	    cb();
	  });
	});
      });
    }, function(err) {
      if (err) res.send(400, {'error': err});

      res.send(200, {});
    });
  });
};
