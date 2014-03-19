var User = require('../model/user');
var passport = require('passport');


// POST /login
// This is an alternative implementation that uses a custom callback to
// acheive the same functionality.
exports.loginPOST = function(req, res, next) {
  console.log('Logging in user');
  console.log('Info: ' + JSON.stringify(req.body, null, 4));
  passport.authenticate('local', function(err, user, info) {
    console.log('Error: ' + err);
    console.log('user: ' + user);
    console.log('INFO: ' + info);
    if (err) { return next(err) }
    if (!user) {
      return res.send(401, {'error' : 'Unknown user'});
    }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      
      ///
      /// Set session-token to DB, not session
      ///
      var token = user.generateRandomToken();
      user.set('accessToken', token);

      user.save( function(err) {
	res.send( {'session-token': user.get('accessToken')} );	
      });
    });
  })(req, res, next);
};

// POST Register
exports.register = function(req, res) {
  console.log('Body: ' + JSON.stringify(req.body, null, 4));
  User.newUser(req.body.email, req.body.password, function(err, user) {
    if(err) {
      console.log(err);
      req.session.messages = [err.message];
      return res.redirect('/register');
    } else {
      console.log('user: ' + user.email + " saved.");
      res.send({'user':user.email});
    }
  });
};

exports.logout = function(req, res){
  req.logout();
  res.redirect('/');
};
