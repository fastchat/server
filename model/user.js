var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , bcrypt = require('bcrypt')
  , SALT_WORK_FACTOR = 10;

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
  accessToken: {type: String}, //Session Token
  groups: [{type: Schema.Types.ObjectId, ref: 'Group'}],
  invites: [{type: Schema.Types.ObjectId, ref: 'Group'}],
  devices: [{type: Schema.Types.ObjectId, ref: 'Device'}]
});

// Bcrypt middleware
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

// cb(err, user)
User.statics.newUser = function(username, password, cb){  
  var usr = new this({ 'username': username, 'password': password });
  usr.save(function(err) {
    if(err) {
      cb(err, null);
    } else {
      cb(null, usr);
    }
  });
};

// cb(usr) - or null if no user is found
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

module.exports = mongoose.model('User', User);
