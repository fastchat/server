var express = require('express');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongoose = require('mongoose');
var http = require('http');
var io = require('socket.io');
var config = require('./config');
var apn = require('apn');
var ObjectId = require('mongoose').Types.ObjectId;

///
/// Models
///
var User = require('./model/user');
var Group = require('./model/group');
var Message = require('./model/message');
var Device = require('./model/device');

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

// Passport session setup. g
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
  User.findOne( {_id: id} , function (err, user) {
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
  User.findOne({ 'username': username.toLowerCase() }, function(err, user) {
    if (err) { return done(err); }
    if (!user) { return done(null, false, { error: 'Incorrect username or password '}); }
    user.comparePassword(password, function(err, isMatch) {
      if (err) return done(err);
      if(isMatch) {
        return done(null, user);
      } else {
        return done(null, false, { error: 'Incorrect username or password' });
      }
    });
  });
}));


// Get the port and create the servers
// Register socket.io as listener
var portNumber = Number(process.env.PORT || 3000);
var app = express();
server = http.createServer(app)
server.listen(portNumber);
io = io.listen(server, {origins: '*:*'});


app.set('port', portNumber);
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('special turkey sauce is good'));
app.use(express.session());
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(__dirname + '/client'));




/**
 * Update how these are set to use app.set('development', stuff);
 */
// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}


var userRoutes = require('./routes/user');
var groupRoutes = require('./routes/group');
var messageRoutes = require('./routes/message');
var deviceRoutes = require('./routes/device');

app.post('/login', userRoutes.loginPOST);
app.delete('/logout', ensureAuthenticated, userRoutes.logout);
app.post('/user', userRoutes.register);
app.get('/user', ensureAuthenticated, userRoutes.profile);
app.post('/user/accept', ensureAuthenticated, userRoutes.acceptInvite);

app.get('/group', ensureAuthenticated, groupRoutes.getGroups);
app.post('/group', ensureAuthenticated, groupRoutes.createGroup);
app.get('/group/:id/messages', ensureAuthenticated, messageRoutes.getMessages);
app.put('/group/:id/invite', ensureAuthenticated, groupRoutes.invite);
app.put('/group/:id/uninvite', ensureAuthenticated, groupRoutes.uninvite);

app.get('/user/device', ensureAuthenticated, deviceRoutes.getDevices);
app.post('/user/device', ensureAuthenticated, deviceRoutes.postDevice);


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
//   Stores the user in the req for fast access later on.
function ensureAuthenticated(req, res, next) {
  console.log('Checking ' + JSON.stringify(req.headers, null, 4));
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
	res.json(401, {'error' : 'You are not logged in!'});
      }
    });
  } else {
    res.send(401, {'error' : 'You are not logged in!'});
  }
}



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
  for (var i = 0; i < socketUser.groups.length; i++) {
    socket.join(socketUser.groups[i]); //Group ID
  }
  socket.emit('ready', 'To go');

  socket.on('message', function(message) {
    console.log('Received Message: ' + JSON.stringify(message, null, 4));
    var room = message.groupId;

    socket.broadcast.to(room).emit('message', message) //emit to 'room' except this socket

    //fix this so you can't add to groups you don't know of

    ///
    /// Make a new message and add it to the group
    ///
    var aMessage = new Message({'from' : socketUser._id,
				'group': new ObjectId(room),
				'text' : message.text,
				'sent' : new Date()
			       });
    aMessage.save(function(err) {
      Group.findOne({'_id' : room}, function(err, group) {
	if (group) {
	  group.messages.push(aMessage);
	  group.save(function(err) {

	  });
	}
      });
    });


    var clients = io.sockets.clients(room);
    var roomUsers = [];
    for (var i = 0; i < clients.length; i++) {
      roomUsers.push(clients[i].handshake.user);
    }

    // Find all users who are in the group
    // Find Users who groups include 'room'
    User.find({groups: { $in : [room] } }, function(err, users) {

      var usersNotInRoom = [];
      for (var i = 0; i < users.length; i++) {
	var foundUser = false;
	for (var j = 0; j < roomUsers.length; j++) {
	  if (roomUsers[j]._id.equals(users[i]._id)) {
	    foundUser = true;
	  }
	}
	if (!foundUser) usersNotInRoom.push(users[i]);
      }

      console.log('users NOT in room: ' + JSON.stringify(usersNotInRoom, null, 4));
      /// Okay, we have the users not in the room.
      // SEnd a message to them.
      for (var i = 0; i < usersNotInRoom.length; i++) {
	var aUserNotInRoom = usersNotInRoom[i];
	aUserNotInRoom.unreadCount++;
	aUserNotInRoom.push(message);
	aUserNotInRoom.save();
      }
    });

  });

  

  socket.on('disconnect', function() {
    // do something with notifications?
  })
  
});


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
