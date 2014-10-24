###
Error Catching on production
###
if process.env.ENV is 'production'
  d = require('domain').create()
  d.on 'error', (err)->
    console.log(err)

###
Code Coverage Middleware. This is currently using a forked version,
because the original hasn't been updated. It covers all files served
by the server. See the Makefile for how to get to this.
###
im = require('istanbul-middleware')
isCoverageEnabled = if process.env.COV_FASTCHAT then yes else no

if isCoverageEnabled
  console.log('Hook loader for coverage - ensure this is not production!')
  im.hookLoader(__dirname)


###
Setup Good Logging with line numbers so I can find my log statements
###
require('console-trace')(always: true)

express = require('express')
params = require('express-params')
passport = require('passport')
LocalStrategy = require('passport-local').Strategy
cookieParser = require('cookie-parser')
session = require('express-session')
bodyParser = require('body-parser')
favicon = require('serve-favicon')
mongoose = require('mongoose-q')()
http = require('http')
config = require('./config')
apn = require('apn')
ObjectId = require('mongoose').Types.ObjectId
helpers = require('./helpers')

###
Models
###
User = require('./index').User
Group = require('./index').Group
Message = require('./index').Message
Device = require('./index').Device

###
Database Setup
###
mongoUri = process.env.MONGOLAB_URI or process.env.MONGOHQ_URL or 'mongodb://localhost/dev'
console.log('Connecting to DB: ' + mongoUri)
mongoose.connect( mongoUri )
db = mongoose.connection
db.on('error', console.error.bind(console, 'Connection Error (Connecting to Mongo). Did you run "mongod"?:'))

db.once 'open', ->
  console.log('Successfully connected to Mongo.')


###
Passport session setup.
To support persistent login sessions, Passport needs to be able to
serialize users into and deserialize users out of the session.  Typically,
this will be as simple as storing the user ID when serializing, and finding
the user by ID when deserializing.
###
passport.serializeUser (user, done)->
  console.log 'What 1'
  done(null, user._id) if user._id

###
Passport Session Setup.
Required for the local session.
We don't use this on the web client, but we could.
###
passport.deserializeUser (id, done)->
  console.log 'What'
  User.findOne _id: id, (err, user)->
    done(err, user)

###
Use the LocalStrategy within Passport.
Strategies in passport require a `verify` function, which accept
credentials (in this case, a username and password), and invoke a callback
with a user object.  In the real world, this would query a database;
however, in this example we are using a baked-in set of users.
###
console.log 'Setting up'
passport.use(new LocalStrategy({usernameField: 'username', passwordField: 'password'}, (username, password, done)->
  User.findByLowercaseUsername(username).then (user)->
    console.log 'Strategy Start 1'
    [user, user.comparePassword(password)]
  .spread (user, matched)->
    console.log 'Strategy Start 2'
    done null, user
  .fail (err)->
    console.log 'Strategy Start 3', err
    done null, false, { error: 'Incorrect username or password!'}
  .done()
))

###
Simple route middleware to ensure user is authenticated.
Use this route middleware on any resource that needs to be protected.  If
the request is authenticated (typically via a persistent login session),
the request will proceed.  Otherwise, the user will be redirected to the
login page.
Stores the user in the req for fast access later on.
###
ensureAuthenticated = (req, res, next)->
  console.log 'Path: ', req.method, req.path
  console.log 'Checking Headers:', req.headers
  if req.headers['session-token']
    console.log 'Found header!'
    token = req.headers['session-token']
    console.log 'Found token: ', token
    User.findOne accessToken: token, (err, user)->
      return next err if err
      return next 401 unless user
      req.user = user
      next()


###
Get the port and create the servers
Register socket.io as listener
###
portNumber = Number(process.env.PORT or 3000)
app = express()
server = http.createServer(app)
server.listen(portNumber)
io = require('./index').Socket.setup(server)
params.extend(app)

#add the coverage handler
if isCoverageEnabled
  #enable coverage endpoints under /coverage
  app.use '/coverage', im.createHandler()


app.set('port', portNumber)
app.use(favicon(__dirname + '/client/favicon.png'))
app.use(require('morgan')())
app.use(bodyParser())
app.use(require('method-override')())
app.use(cookieParser('special turkey sauce is good'))
app.use(session({ secret: 'this is another secret', name: 'sid', cookie: { secure: true }}))
app.use(passport.initialize())
app.use(passport.session())
app.use(express.static(__dirname + '/client'))

#
# Update how these are set to use app.set('development', stuff);
#
if 'dev' is process.env.ENV
  app.use require('errorhandler')()

userRoutes = require('./index').UserRoutes
groupRoutes = require('./index').GroupRoutes
messageRoutes = require('./index').MessageRoutes
deviceRoutes = require('./index').DeviceRoutes

#
# Forces all 'id' parameters to be a proper Mongoose ObjectId, or else it will 404
#
app.param('id', /^[0-9a-f]{24}$/)
app.param('mesId', /^[0-9a-f]{24}$/)

app.post('/login', userRoutes.loginPOST)
app.delete('/logout', ensureAuthenticated, userRoutes.logout)
app.post('/user', userRoutes.register)
app.get('/user', ensureAuthenticated, userRoutes.profile)
app.post('/user/:id/avatar', ensureAuthenticated, userRoutes.postAvatar)
app.get('/user/:id/avatar', ensureAuthenticated, userRoutes.getAvatar)
app.get('/user/:id?*', ensureAuthenticated, userRoutes.profile)

app.get('/group', ensureAuthenticated, groupRoutes.getGroups)
app.post('/group', ensureAuthenticated, groupRoutes.createGroup)
app.get('/group/:id/message', ensureAuthenticated, messageRoutes.getMessages)
app.post('/group/:id/message', ensureAuthenticated, messageRoutes.postMessageData)
app.get('/group/:id/message/:mesId/media', ensureAuthenticated, messageRoutes.getMessageData)
app.put('/group/:id/leave', ensureAuthenticated, groupRoutes.leaveGroup)
app.put('/group/:id/add', ensureAuthenticated, groupRoutes.add)
app.put('/group/:id/settings', ensureAuthenticated, groupRoutes.changeSettings)

app.get('/user/device', ensureAuthenticated, deviceRoutes.getDevices)
app.post('/user/device', ensureAuthenticated, deviceRoutes.postDevice)

app.use (err, req, res, next)->
  console.error err.stack
  next err

app.use (err, req, res, next)->
  console.log 'Got middleware!', err
  if err is 404
    res.status(404).json error: 'Not Found'
  else if err is 500
    res.status(500).json error: 'Internal Server Error'
  else if err is 401
    res.status(401).json error : 'Unauthorized'
  else if (typeof err is 'string' or err instanceof String)
    res.status(400).json error: err
  else if err.isBoom
    message = err.output.payload.message or err.output.payload.error
    console.log('BOOM ERROR', err.output.payload.statusCode, message)
    res.status(err.output.payload.statusCode).json error: message
  else
    next err

# 404
app.use (req, res, next)->
  res.status(404).json error: 'Not Found'


options =
  batchFeedback: true
  interval: 300

feedback = new apn.Feedback(options)
feedback.on 'feedback', (devices)->
  devices.forEach (item)->
    console.log 'FEEDBACK: ', item
