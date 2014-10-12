///
/// Error Catching on production
///
if (process.env.ENV === 'production') {
  var d = require('domain').create();
  d.on('error', function(err) {
    // handle the error safely
    // This will send an email one day
    console.log(err);
  });
}

///
/// Code Coverage Middleware. This is currently using a forked version,
/// because the original hasn't been updated. It covers all files served
/// by the server. See the Makefile for how to get to this.
///
var im = require('istanbul-middleware'),
    isCoverageEnabled = (process.env.COV_FASTCHAT ? true : false); // or a mechanism of your choice

if (isCoverageEnabled) {
    console.log('Hook loader for coverage - ensure this is not production!');
    im.hookLoader(__dirname);
}

///
/// Setup Good Logging with line numbers so I can find my log statements
///
require('console-trace')({
  always: true,
});

var express = require('express');
var params = require('express-params');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var cookieParser = require('cookie-parser');
var session = require('express-session');
var bodyParser = require('body-parser');
var favicon = require('serve-favicon');
var mongoose = require('mongoose-q')();
var http = require('http');
var config = require('./config');
var apn = require('apn');
var ObjectId = require('mongoose').Types.ObjectId;
var helpers = require('./helpers');

///
/// Models
///
var User = require('./index').User;
var Group = require('./index').Group;
var Message = require('./index').Message;
var Device = require('./index').Device;

///
/// Database Setup
///
var mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/dev';
console.log('Connecting to DB: ' + mongoUri);
mongoose.connect( mongoUri );
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection Error (Connecting to Mongo). Did you run "mongod"?:'));
db.once('open', function callback() {
  console.log('Successfully connected to Mongo.');
});

// Passport session setup.
// To support persistent login sessions, Passport needs to be able to
// serialize users into and deserialize users out of the session.  Typically,
// this will be as simple as storing the user ID when serializing, and finding
// the user by ID when deserializing.
passport.serializeUser(function(user, done) {
  if (user._id) return done(null, user._id);
});

// Passport Session Setup.
// Required for the local session.
// We don't use this on the web client, but we could.
passport.deserializeUser(function(id, done) {
  User.findOne({_id: id}, function (err, user) {
    done(err, user);
  });
});

// Use the LocalStrategy within Passport.
// Strategies in passport require a `verify` function, which accept
// credentials (in this case, a username and password), and invoke a callback
// with a user object.  In the real world, this would query a database;
// however, in this example we are using a baked-in set of users.
passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
  }, function(username, password, done) {
    User.findByLowercaseUsername(username)
      .then(function(user) {
	return [user, user.comparePassword(password)];
      })
      .spread(function(user, matched) {
	done(null, user);
      })
      .catch(function(err) {
	done(null, false, { error: 'Incorrect username or password!'});
      })
      .done();
  }));


// Get the port and create the servers
// Register socket.io as listener
var portNumber = Number(process.env.PORT || 3000);
var app = express();
server = http.createServer(app)
server.listen(portNumber);
var io = require('./index').Socket.setup(server);
params.extend(app);

// add the coverage handler
if (isCoverageEnabled) {
    //enable coverage endpoints under /coverage
    app.use('/coverage', im.createHandler());
}


app.set('port', portNumber);
app.use(favicon(__dirname + '/client/favicon.png'));
app.use(require('morgan')());
app.use(bodyParser());
app.use(require('method-override')());
app.use(cookieParser('special turkey sauce is good'));
app.use(session({ secret: 'this is another secret', name: 'sid', cookie: { secure: true }}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname + '/client'));

/**
 * Update how these are set to use app.set('development', stuff);
 */
if ('dev' === process.env.ENV) {
  app.use(require('errorhandler')());
}

var userRoutes = require('./index').UserRoutes;
var groupRoutes = require('./index').GroupRoutes;
var messageRoutes = require('./index').MessageRoutes;
var deviceRoutes = require('./index').DeviceRoutes;

///
// Forces all 'id' parameters to be a proper Mongoose ObjectId, or else it will 404
///
app.param('id', /^[0-9a-f]{24}$/);
app.param('mesId', /^[0-9a-f]{24}$/);

app.post('/login', userRoutes.loginPOST);
app.delete('/logout', ensureAuthenticated, userRoutes.logout);
app.post('/user', userRoutes.register);
app.get('/user', ensureAuthenticated, userRoutes.profile);
app.post('/user/:id/avatar', ensureAuthenticated, userRoutes.postAvatar);
app.get('/user/:id/avatar', ensureAuthenticated, userRoutes.getAvatar);
app.get('/user/:id?*', ensureAuthenticated, userRoutes.profile);

app.get('/group', ensureAuthenticated, groupRoutes.getGroups);
app.post('/group', ensureAuthenticated, groupRoutes.createGroup);
app.get('/group/:id/message', ensureAuthenticated, messageRoutes.getMessages);
app.post('/group/:id/message', ensureAuthenticated, messageRoutes.postMessageData);
app.get('/group/:id/message/:mesId/media', ensureAuthenticated, messageRoutes.getMessageData);
app.put('/group/:id/leave', ensureAuthenticated, groupRoutes.leaveGroup);
app.put('/group/:id/add', ensureAuthenticated, groupRoutes.add);
app.put('/group/:id/settings', ensureAuthenticated, groupRoutes.changeSettings);

app.get('/user/device', ensureAuthenticated, deviceRoutes.getDevices);
app.post('/user/device', ensureAuthenticated, deviceRoutes.postDevice);

app.use(function(err, req, res, next) {
  console.error(err.stack);
  next(err);
});

app.use(function(err, req, res, next) {
  console.log('Got middleware!', err);
  if (err === 404) {
    res.json(404, {error: 'Not Found'});
  } else if (err === 500) {
    res.json(500, {error: 'Internal Server Error'});
  } else if (err === 401) {
    res.json(401, {error : 'Unauthorized'});
  } else if (typeof err === 'string' || err instanceof String) {
    res.json(400, {error: err});
  } else if (err.isBoom) {
    var message = err.output.payload.message || err.output.payload.error;
    console.log('BOOM ERROR', err.output.payload.statusCode, message);
    res.status(err.output.payload.statusCode).json({error: message});
  } else {
    next(err);
  }
});

// 404
app.use(function(req, res, next) {
  res.status(404).json({error: 'Not Found'});
});


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
//   Stores the user in the req for fast access later on.
function ensureAuthenticated(req, res, next) {
  console.log('Path: ', req.method, req.path);
  console.log('Checking Headers:', req.headers);
  if (req.headers['session-token'] !== undefined) {
    console.log('Found header!');
    var token = req.headers['session-token'];
    console.log('Found token: ' + token);
    User.findOne( { accessToken: token }, function (err, usr) {
      console.log('User: ' + usr);
      if (usr && !err) {
	req.user = usr;
	return next();
      } else {
	next(401);
      }
    });
  } else {
    next(401);
  }
}

var options = {
  "batchFeedback": true,
  "interval": 300
};

var feedback = new apn.Feedback(options);
feedback.on("feedback", function(devices) {
  devices.forEach(function(item) {
    console.log('FEEDBACK: ' + JSON.stringify(item, null, 4));
    // Do something with item.device and item.time;
  });
});
