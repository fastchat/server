var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , bcrypt = require('bcrypt')
  , SALT_WORK_FACTOR = 10;

///
/// User should probably own an account object? Or somethign that organizes all account info
///
var User = new Schema({
  username: {type: String, required: true, unique: true, lowercase: true},
  password: {type: String, required: true},
  accessToken: {type: String}, //Session Token
  groups: [{type: Schema.Types.ObjectId, ref: 'Group'}],
  invites: [{type: Schema.Types.ObjectId, ref: 'Group'}],
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
User.statics.newUser = function(email, password, cb){  
  var usr = new this({ 'email': email, 'password': password });
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

// Password verification
User.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if(err) return cb(err);
    cb(null, isMatch);
  });
};

// Session Token implementation helper method
// This should probably be re-implemented as a secure method
// http://stackoverflow.com/questions/8855687/secure-random-token-in-node-js
User.methods.generateRandomToken = function () {
  var user = this,
  chars = "_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890",
  token = new Date().getTime() + '_';
  for ( var x = 0; x < 16; x++ ) {
    var i = Math.floor( Math.random() * 62 );
    token += chars.charAt( i );
  }
  return token;
};

module.exports = mongoose.model('User', User);
