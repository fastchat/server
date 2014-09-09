var mongoose = require('mongoose-q')()
  , Schema = mongoose.Schema
  , bcrypt = require('bcrypt')
  , SALT_WORK_FACTOR = 10
  , Device = require('./device')
  , Group = require('./group')
  , ObjectId = mongoose.Types.ObjectId
  , Boom = require('boom');


/**
 * Valid Username Regex
 */
var regex = /^[a-zA-Z0-9-_.]+$/;

/**
 * User Model
 * Stores all the information about the user. Users are required to have a username
 * that must be unique. The password is hashed and stored using bcrypt. The accessToken
 * is used to authenticate the user on API calls.
 *
 * Each users knows of it's groups and also knows of any pending invites.
 */
var User = new Schema({
  username: {type: String, required: true, unique: true, lowercase: true},
  password: {type: String, required: true},
  accessToken: [{type: String, default: []}], //Session Token
  groups: [{type: Schema.Types.ObjectId, ref: 'Group'}],
  leftGroups: [{type: Schema.Types.ObjectId, ref: 'Group', default: [] }],
  devices: [{type: Schema.Types.ObjectId, ref: 'Device', default: [] }],
  groupSettings: [{type: Schema.Types.ObjectId, ref: 'GroupSetting', default: []}],
  avatar: {type: String, default: null}
});

/**
 * BCrypt Middleware to hash the password given before the user is saved.
 * This is never called explicitly.
 */
User.pre('save', function(next) {
  var user = this;
  
  if(!user.isModified('password')) return next();

  bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
    if(err) return next(err);
    
    bcrypt.hash(user.password, salt, function(err, hash) {
      if(err) return next(err);
      user.password = hash;
      next();
    });
  });
});


/*
 * Creates a new user from a username and password.
 * This will create the user and make a default group for them to chat
 * in (which they can rename or invite someone too), and then it will return
 * the user.
 *
 * @username The username for the user.
 * @password The password for the user.
 * @cb callback(Error, User)
 */
User.statics.register = function(username, password) {
  
  if (!username) throw Boom.badRequest('Username is required!');
  if (!password) throw Boom.badRequest('Password is required!');
  if (username.search(regex) == -1) throw Boom.badRequest('Invalid username! Only alphanumeric values are allowed, with -, _, and .');

  console.log('NEW USER');

  var newUser = new this({ 'username': username, 'password': password });
  return newUser.saveQ()
    .then(function() { 
      return newUser; 
    })
    .catch(function(err) {
      var message = error.message;
      if (message.indexOf('E11000') > -1) {
	throw Boom.badRequest('That username was already taken.');
      } else if (message.indexOf('Validation failed') > -1) {
	return Boom.badRequest('Username and password are required!');
      }
      return err;
    });
};

/**
 * Finds the user from a token.
 * Will return the user or null if none found.
 *
 * @token The token to find the user.
 * @cb callback(User) or null if no user found.
 */
User.statics.fromToken = function(token, cb) {
  if (!token) return cb(null);
  
  this.findOne( { 'accessToken': token }, function (err, usr) {
    return cb(usr);
  });
};

/**
 * Compares a given password with the user's password.
 * Uses bcrypt and hashes the given password.
 *
 * @candidatePassword The given password to compare
 * @cb The callback with the result. cb(error, isMatch)
 */
User.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if(err) return cb(err);
    cb(null, isMatch);
  });
};


/**
 * Creates the session token for the user.
 * Utilizes the crypto library to generate the token, from the docs it:
 * 'Generates cryptographically strong pseudo-random data'
 * We then change that to a hex string for nice representation.
 *
 * @cb A callback with the given token. cb(token)
 */
User.methods.generateRandomToken = function (cb) {
  require('crypto').randomBytes(48, function(ex, buf) {
    cb(buf.toString('hex'));
  });
};

/**
 * Pushes a message to each device this user controls.
 * We will want this to be 'smarter' in the future, but this is a good first
 * pass. Smarter implementations will understand which device the user used
 * last and will send the notification to that device first, wait some time,
 * then send a notification to the other devices.
 *
 * @message The message from the server. Should have 'text' property.
 */
User.methods.push = function(group, message, unread, contentAvailable) {

  console.log('Attempting to send to: '+ this.username);
  Device.find({ 'user': this._id }, function(err, devices) {
    devices.forEach(function(device) {
      device.send(group, message, unread, contentAvailable);
    });
  });
};

//message.fromUser.username + '@' + group.name + ': ' + message.text

/**
 * A convenience method that will return if the user is in the group
 * requested.
 *
 * @group The group as a String or ObjectId that you want to see if the
 * user is in.
 */
User.methods.hasGroup = function(group) {
  if (!group) return false;

  group = group.toString();
  var groupId = group;

  try {
    groupId = new ObjectId(group);
  } catch (err) {
    return false;
  }

  return this.groups.indexOfEquals(groupId) !== -1;
};

module.exports = mongoose.model('User', User);
