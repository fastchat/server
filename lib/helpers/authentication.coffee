#
# FastChat
# 2015
#

###
Passport session setup.
To support persistent login sessions, Passport needs to be able to
serialize users into and deserialize users out of the session.  Typically,
this will be as simple as storing the user ID when serializing, and finding
the user by ID when deserializing.
###
passport.serializeUser (user, done)->
  console.log 'What 1', user
  done(null, user._id) if user._id

###
Passport Session Setup.
Required for the local session.
We don't use this on the web client, but we could.
###
passport.deserializeUser (id, done)->
  console.log 'What', id
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
  console.log '\n\n'
  console.log 'Path: ', req.method, req.path
  console.log '\n\n'
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
  else
    next 401
