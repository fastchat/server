var User = require('../model/user');
var Group = require('../model/group');
var Message = require('../model/message');
var async = require('async');
var ObjectId = require('mongoose-q')().Types.ObjectId; 
var io = require('../socket/socket');
var GroupSetting = require('../model/groupSetting');

exports.getGroups = function(req, res, next) {

  Group.groupsForUser(req.user).then(function(groups) {
    res.json(groups);
  })
  .fail(next)
  .done();
};

exports.createGroup = function(req, res, next) {

  Group.newGroup(req.body.members, req.user, req.body.text, req.body.name)
    .then(function(group) {
      res.status(201).json(group);
    })
    .fail(next)
    .done();
};


// PUT /group/:id/leave
exports.leaveGroup = function(req, res, next) {

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
      return next(404);
    }

    var index = group.members.indexOfEquals(user._id);
    if (index === -1) {
      return next(404);
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
      if (err) return next(err);
      
      res.json(200, {});
    });
  });
};

exports.changeSettings = function(req, res, next) {
  console.log('HERE');
  var name = req.body.name;
  var idParam = req.params.id.toString();
  var groupId = new ObjectId(idParam);
  var user = req.user;

  if (!user.hasGroup(groupId)) {
    return next(404);
  }

  Group.findOne( { _id : groupId }, function(err, group) {
    if (err || !group) return next(404);

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

exports.add = function(req, res, next) {
  console.log('Invite Body: ' + JSON.stringify(req.body, null, 4));

  var idParam = req.params.id.toString();
  var invites = req.body.invitees;
  var groupId = new ObjectId(idParam);

  if ( !(invites instanceof Array) ) {
    return next('invitees must be an Array!');
  }

  if (invites.length == 0 ) {
    return res.json(200, {});
  }

  Group.findOne( { _id : groupId }, function(err, group) {
    if (err || !group) return next(404);

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
      if (err) return next(err);

      res.send(200, {});
    });
  });
};
