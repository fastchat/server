var express = require('express');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongoose = require('mongoose');
var http = require('http');
var io = require('socket.io');

var env = process.env.NODE_ENV || 'dev';
var config = require('./config')[env];

///
/// Models
///
var User = require('./model/user');
var Group = require('./model/group');
var Message = require('./model/message');

///
/// Database Setup
///
var mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/dev'
mongoose.connect( mongoUri );
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection Error (Connecting to Mongo). Did you run "mongod"?:'));
db.once('open', function callback() {
  console.log('Successfully connected to Mongo.');
});

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.
//
//   Both serializer and deserializer edited for Remember Me functionality

passport.serializeUser(function(user, done) {
  if (user._id) return done(null, user._id);
});


passport.deserializeUser(function(id, done) {
  User.findOne( {_id: id} , function (err, user) {
    done(err, user);
  });
});

// Use the LocalStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a username and password), and invoke a callback
//   with a user object.  In the real world, this would query a database;
//   however, in this example we are using a baked-in set of users.

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, function(email, password, done) {
  User.findOne({ 'email': email }, function(err, user) {
    console.log("User: " + user);
    if (err) { return done(err); }
    if (!user) { return done(null, false, { error: 'Unknown user ' + email }); }
    user.comparePassword(password, function(err, isMatch) {
      if (err) return done(err);
      if(isMatch) {
        return done(null, user);
      } else {
        return done(null, false, { error: 'Invalid password' });
      }
    });
  });
}));


// Create HTTP server on port 3000 and register socket.io as listener
var portNumber = Number(process.env.PORT || 3000);
var app = express();
server = http.createServer(app)
server.listen(portNumber);
io = io.listen(server, {origins: '*:*'});


app.set('port', portNumber);
//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'ejs');
//app.engine('ejs', require('ejs-locals'));
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

/*
app.all('/', function(req,res,next) {
  res.header("Access-Control-Allow-Origin","*");
  res.header("Access-Control-Allow-Headers","X-Requested-With");
  next();
});
*/

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


app.post('/login', userRoutes.loginPOST);
app.get('/logout', userRoutes.logout); //delete?
app.post('/register', userRoutes.register);
app.get('/group', ensureAuthenticated, groupRoutes.getGroups);

app.post('/group', ensureAuthenticated, groupRoutes.createGroup);
app.get('/group/:id/messages', ensureAuthenticated, messageRoutes.getMessages);
app.put('/group/:id/invite', ensureAuthenticated, groupRoutes.invite);
app.put('/group/:id/uninvite', ensureAuthenticated, groupRoutes.uninvite);


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  //  if ( req.isAuthenticated() ) {
  //    return next();
  //  } else {
  console.log('Checking ' + JSON.stringify(req.headers, null, 4));
  if (req.headers['session-token'] !== undefined) {
    console.log('Found header!');
    var token = req.headers['session-token'];
    console.log('Found token: ' + token);
    User.findOne( { accessToken: token }, function (err, usr) {
      console.log('User: ' + usr);
      if (usr && !err) {
	return next();
      } else {
	//401
	res.send(401);
      }
    });
  } else {
    res.send(401, {'error' : 'You must have a session token!'});
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
    var room = message.groupId;

    socket.broadcast.to(room).emit('message', message) //emit to 'room' except this socket

    ///
    /// Make a new message and add it to the group
    ///
/*
    var aMessage = new Message(message);
    aMessage.save(function(err) {
      //saved
    });
*/

  });

  

  socket.on('disconnect', function() {
    // do something with notifications?
  })
  
});
