var User = require('../model/user');
var Group = require('../model/group');
var passport = require('passport');
var ObjectId = require('mongoose').Types.ObjectId; 
var Errors = require('../model/errors');

// POST /login
// This is an alternative implementation that uses a custom callback to
// acheive the same functionality.
exports.loginPOST = function(req, res, next) {
  console.log('Logging in user');
  passport.authenticate('local', function(err, user, info) {
    console.log('Error: ' + err);
    console.log('user: ' + user);
    console.log('INFO: ' + info);
    if (err) { return next(err) }
    if (!user) {
      return res.send(401, {'error' : 'Incorrect username or password!'});
    }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      
      ///
      /// Set session-token to DB, not session
      ///
      if (!user.accessToken) {
	user.generateRandomToken(function(token) {
	  user.set('accessToken', token);
	  user.save( function(err) {
	    res.send( {'session-token': user.get('accessToken')} );
	  });
	});	
      } else {
	res.send( {'session-token': user.get('accessToken')} );
      }
    });
  })(req, res, next);
};

// POST /user
exports.register = function(req, res) {
  User.newUser(req.body.username, req.body.password, function(err, user) {
    console.log('ERROR: ' + JSON.stringify(err, null, 4));
    if(err) {
      res.send(400, {'error' : Errors.parseRegisterError(err)});
    } else {
      res.send(201, user);
    }
  });
};

// GET /user
exports.profile = function(req, res) {

  User.findOne( {'_id' : req.user._id } )
    .populate('groups', 'name')
    .exec(function(err, usr) {
      if (err || !usr) return res.send(400, {'error' : 'The user was not found!'});
      
      res.send({'profile': usr});
  });
};

//Put Invites
exports.acceptInvite = function(req, res) {

  var inviteToAccept = req.body.invite;
  var usr = req.user;

  if (inviteToAccept >= usr.invites.length) return res.send(400, {'error': 'The invite was not found!'});
  
  // Get the group from the invite...
  // Remove the invite from the group
  // Remove the invite from the user
  // Add the user to the group
  // Add the group to the user.
  Group.findOne( {_id: usr.invites[inviteToAccept]}, function(err, group) {
    if (err || !group) return res.send(400, {'error': 'The Group was not found for the invite! Maybe it was deleted?'});
    
    var index = group.invites.indexOf(usr._id);
    if (index > -1) {
      group.invites.splice(index, 1);
      group.members.push(usr._id);

      group.save(function(err) {
	if (err) return res.send(400, {'error' : 'Error adding the user to the group!'});
	var index2 = usr.invites.indexOf(group._id);
	if (index2 > -1) {
	  usr.invites.splice(index2, 1);
	  usr.groups.push(group._id);
	  usr.save(function(err) {
	    if (err) return res.send(400, {'error' : 'Error adding the user to the group!'});
	    res.send(200);
	  });
	} else {
	  res.send(400, {'error' : 'Error adding the user to the group!'});
	}
      });
    } else {
      res.send(400, {'error' : 'Error adding the user to the group!'});
    }
  });

};

exports.logout = function(req, res){
  req.user.set('accessToken', null);
  req.user.save(function(err) {
    req.logout();
    res.json(200, {});
  });
};
