var User = require('../model/user')
  , Group = require('../model/group')
  , passport = require('passport')
  , ObjectId = require('mongoose-q')().Types.ObjectId
  , Q = require('q')
  , Device = require('../model/device')
  , multiparty = require('multiparty')
  , uuid = require('uuid')
  , Boom = require('boom');



// POST /login
// This is an alternative implementation that uses a custom callback to
// acheive the same functionality.
exports.loginPOST = function(req, res, next) {
  console.log('Logging in user');
  passport.authenticate('local', function(err, user, info) {
    console.log('Error: ' + err);
    console.log('user: ' + user);
    console.log('INFO: ' + info);
    if (err) return next(err);
    if (!user) return next(401);

    req.logIn(user, function(err) {
      console.log('LOGGED IN!!!!!', err);
      if (err) return next(err);

      ///
      /// Set session-token to DB, not session
      ///
      var token = user.generateRandomToken();
      user.accessToken.push(token)
      user.saveQ()
	.then(function() {
	  res.json( {'session-token': token} );
	})
        .fail(next)
        .done();
    });
  })(req, res, next);
};

// POST /user
exports.register = function(req, res, next) {

  var username = req.body.username;
  var password = req.body.password;

  User.register(username, password)
    .then(function(user) {
      res.status(201).json(user);
    })
    .fail(next)
    .done();
};

// GET /user
exports.profile = function(req, res, next) {

  User.findOne({'_id' : req.user._id})
    .populate('groups', 'name')
    .populate('groupSettings')
    .execQ()
    .then(function(user) {
      res.json({profile: user});
    })
    .catch(next)
    .done();
};


exports.logout = function(req, res, next) {

  var user = req.user;
  var all = req.query.all === 'true';

  user.logout(all, req.headers['session-token'])
    .then(function() {
      req.user = null;
      req.logout();
      res.json({});
    })
    .fail(next)
    .done();
};

exports.postAvatar = function(req, res, next) {

  var user = req.user;
  var form = new multiparty.Form();

  form.parse(req, function(err, fields, files) {
    if (err) throw err;
    
    user.uploadAvatar(fields, files)
      .then(function() {
	res.status(200).json({});
      })
      .fail(next)
      .done();
  });
};

exports.getAvatar = function(req, res, next) {

  var idParam = req.params.id.toString();
  var userId = new ObjectId(idParam);

  User.findOneQ({'_id': userId})
    .then(function(user) {
      if (!user) throw Boom.notFound();

      return user.getAvatar()
	.spread(function(meta, data) {
	  res.contentType(meta); //this is lying
          res.write(data, encoding='binary')
          res.end()
	});
    })
    .fail(next)
    .done();
};
