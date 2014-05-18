var User = require('../model/user');
var Group = require('../model/group');
var passport = require('passport');
var ObjectId = require('mongoose').Types.ObjectId;
var Errors = require('../model/errors');
var Device = require('../model/device');
var multiparty = require('multiparty');
var fs = require('fs');
var uuid = require('uuid');
var knox = require('knox').createClient({
    key: process.env.AWS_KEY,
    secret: process.env.AWS_SECRET,
    bucket: 'com.fastchat.dev.avatars'
});

var EXTENSION_LOOKUP = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif' : 'gif'
};
var mimeTypes = ['image/jpeg', 'image/png', 'image/gif'];

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
      return next(401);
    }
    req.logIn(user, function(err) {
      if (err) { return next(err); }

      ///
      /// Set session-token to DB, not session
      ///
      user.generateRandomToken(function(token) {
	user.accessToken.push(token);
	user.save( function(err) {
	  res.send( {'session-token': token} );
	});
      });
    });
  })(req, res, next);
};

// POST /user
exports.register = function(req, res, next) {

  var regexp = /^[a-zA-Z0-9-_.]+$/;
  var username = req.body.username;

  if (username && username.search(regexp) == -1) {
    return next('Invalid username! Only alphanumeric values are allowed, with -, _, and .');
  }

  User.newUser(req.body.username, req.body.password, function(err, user) {
    console.log('ERROR: ' + JSON.stringify(err, null, 4));
    if(err) {
      return next(Errors.parseRegisterError(err));
    } else {
      return res.send(201, user);
    }
  });
};

// GET /user
exports.profile = function(req, res, next) {

  User.findOne( {'_id' : req.user._id } )
    .populate('groups', 'name')
    .populate('groupSettings')
    .exec(function(err, usr) {
      console.log('ERR: ' + err);
      if (err || !usr) return next(404);

      res.send({'profile': usr});
  });
};


exports.logout = function(req, res, next) {

  var user = req.user;
  var shouldLogoutAll = req.query.all === 'true';

  var tokens = [];
  if (shouldLogoutAll) {
    tokens = tokens.concat(user.accessToken);
    user.accessToken.splice(0, user.accessToken.length);
  } else {
    var index = user.accessToken.indexOf(req.headers['session-token']);
    if (index > -1) {
      user.accessToken.splice(index, 1);
      tokens.push(req.headers['session-token']);
    }
  }

  Device.find({'accessToken' : { $in: tokens} }, function(err, devices) {
    console.log('Devices: ' + JSON.stringify(devices, null, 4));

    devices.forEach(function(device) {
      device.loggedIn = false;
      device.save();
    });

    user.save(function(err) {
      req.user = null;
      req.logout();
      res.json(200, {});
    });
  });
};

exports.postAvatar = function(req, res, next) {

  var user = req.user;
  var form = new multiparty.Form();

  form.parse(req, function(err, fields, files) {
    if (!files) return next('File was not successfully uploaded!');
    if (!files.avatar) return next('Avatar was not successfully uploaded!');

    console.log('Fields: ' + JSON.stringify(fields, null, 4));
    console.log('FILES: ' + JSON.stringify(files, null, 4));

    var file = files.avatar[0];
    if (!file) return next('File was not successfully uploaded!');

    var stream = fs.createReadStream(file.path)
    var s3req;
    var type = mimeTypes.indexOf(file.headers['content-type']);

    if ( type > -1 ) {
      var randomName = uuid.v4() + '.' + EXTENSION_LOOKUP[mimeTypes[type]];

      console.log('Uploading to S3', JSON.stringify(file, null, 4));

      s3req = knox.putStream(stream, randomName, {
	'Content-Type': file.headers['content-type'],
	'Cache-Control': 'max-age=604800',
	'x-amz-acl': 'public-read',
	'Content-Length': file.size
      },
	function(err, result) {

	  if (err) return next('There was an error uploading your image!');

	  /// Now we have uploaded their image to S3, so let's add it to their user profile.
	  user.avatar =  result.req.path.replace(/^.*[\\\/]/, '');
	  user.save(function(err) {
	    console.log('RESPONSE 5: ');
	    return res.json(200, {});
	  });
	});

      s3req.on('response', function(s3res){

	console.log('RESPONSE: ' + s3res.statusCode);

	if (s3res.statusCode == 200) {

	} else {
	  console.log('RESPONSE 3: ' + s3res.statusCode);
	  return res.json(s3res, {'error' : 'THere was an error uploading your image!'});
	}

      });
      } else {
	console.log('RESPONSE 7: ');
	return next('File is not a supported type!');
      }
  });
};

exports.getAvatar = function(req, res, next) {

  var idParam = req.params.id.toString();
  var userId = new ObjectId(idParam);
  var data = '';

  User.findOne( { '_id' : userId }, function(err, user) {
    if(err || !user) return next(404);

    if (!user.avatar) {
      return res.send(200, {});
    }

    knox.get(user.avatar).on('response', function(s3res){

      if (s3res.statusCode < 200 || s3res.statusCode > 300) {
        return next('There was an error fetching your image!');
      }

      s3res.setEncoding('binary');
      s3res.on('data', function(chunk){
        data += chunk;
      });

      s3res.on('end', function() {
        res.contentType('image/jpeg');
        res.write(data, encoding='binary')
        res.end()
      });
    }).end();
  });
};
