var mongoose = require('mongoose-q')()
  , Schema = mongoose.Schema
  , bcrypt = require('bcrypt')
  , SALT_WORK_FACTOR = 10
  , Device = require('./device')
  , Group = require('./group')
  , ObjectId = mongoose.Types.ObjectId
  , Q = require('q')
  , fs = require('fs')
  , uuid = require('uuid')
  , Boom = require('boom');

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
User.statics = {
  
  register: function(username, password) {
    
    if (!username) throw Boom.badRequest('Username is required!');
    if (!password) throw Boom.badRequest('Password is required!');
    if (username.search(regex) == -1) throw Boom.badRequest('Invalid username! Only alphanumeric values are allowed, with -, _, and .');

    console.log('NEW USER');

    var newUser = new this({ 'username': username, 'password': password });
    return newUser.saveQ()
      .then(function() { 
	return newUser; 
      })
      .fail(function(err) {
	var message = error.message;
	if (message.indexOf('E11000') > -1) {
	  throw Boom.badRequest('That username was already taken.');
	} else if (message.indexOf('Validation failed') > -1) {
	  return Boom.badRequest('Username and password are required!');
	}
	return err;
      });
  },

  findByLowercaseUsername: function(username) {
    return this.findOneQ({ 'username': username.toLowerCase() })
      .then(function(user) {
	if (!user) throw new Error('Incorrect username or password!');
	return user;
      });
  }
};


User.methods = {

  /**
   * Compares a given password with the user's password.
   * Uses bcrypt and hashes the given password.
   *
   * @candidatePassword The given password to compare
   * @cb The callback with the result. cb(error, isMatch)
   */
  comparePassword: function(candidatePassword, cb) {
    var compare = Q.denodeify(bcrypt.compare);
    return compare(candidatePassword, this.password)
      .then(function(matched) {
	if (!matched) throw new Error('Incorrect username or password');
	return matched;
      });
  },

  /**
   * Creates the session token for the user.
   * Utilizes the crypto library to generate the token, from the docs it:
   * 'Generates cryptographically strong pseudo-random data'
   * We then change that to a hex string for nice representation.
   */
  generateRandomToken: function () {
    return require('crypto').randomBytes(48).toString('hex');
  },

  /**
   * Pushes a message to each device this user controls.
   * We will want this to be 'smarter' in the future, but this is a good first
   * pass. Smarter implementations will understand which device the user used
   * last and will send the notification to that device first, wait some time,
   * then send a notification to the other devices.
   *
   * @message The message from the server. Should have 'text' property.
   */
  push: function(group, message, unread, contentAvailable) {

    console.log('Attempting to send to: '+ this.username);
    Device.find({ 'user': this._id }, function(err, devices) {
      devices.forEach(function(device) {
	device.send(group, message, unread, contentAvailable);
      });
    });
  },
  
  /**
   * A convenience method that will return if the user is in the group
   * requested.
   *
   * @group The group as a String or ObjectId that you want to see if the
   * user is in.
   */
  hasGroup: function(group) {
    if (!group) return false;

    group = group.toString();
    var groupId = group;

    try {
      groupId = new ObjectId(group);
    } catch (err) {
      return false;
    }

    return this.groups.indexOfEquals(groupId) !== -1;
  },

  logout: function(all, token) {

    var self = this;
    var tokens = [];
    
    if (all) {
      tokens = tokens.concat(this.accessToken);
      this.accessToken.splice(0, this.accessToken.length);
    } else {
      var index = this.accessToken.indexOf(token);
      if (index > -1) {
	this.accessToken.splice(index, 1);
	tokens.push(token);
      }
    }

    return Device.findQ({accessToken : {$in: tokens}})
      .then(function(devices) {
	console.log('Devices: ', devices);

	devices.forEach(function(device) {
	  device.logout();
	});
	return self.saveQ();
      });
  },

  setAvatar: function(name) {
    this.avatar = name;
    this.saveQ();
  },

  uploadAvatar: function(fields, files) {

    console.log('GOT HERE!');
    if (!files) throw new Error('No files were found in the upload!');
    if (!files.avatar) throw new Error('Avatar was not found in the upload!');

    var file = files.avatar[0];
    if (!file) throw new Error('Avatar was not found in the files, in first index!');

    var stream = fs.createReadStream(file.path)
    var self = this;    

    //remove later
    var type = mimeTypes.indexOf(file.headers['content-type']);

    if ( type == -1 ) throw new Error('File is not a supported type!');

    var randomName = uuid.v4() + '.' + EXTENSION_LOOKUP[mimeTypes[type]];

    console.log('Uploading to S3', file);

    var options = {
      'Content-Type': file.headers['content-type'],
      'Cache-Control': 'max-age=604800',
      'x-amz-acl': 'public-read',
      'Content-Length': file.size
    }

    var deferred = Q.defer();

    knox.putStream(stream, randomName, options, function(err, result) {
      if (err) return deferred.reject(err);
      return deferred.resolve(self.setAvatar(result.req.path.replace(/^.*[\\\/]/, '')));
    });
    return deferred.promise;
  },

  getAvatar: function() {
    if (!this.avatar) throw Boom.notFound();

    var deferred = Q.defer();
    var data = '';
    
    knox.get(this.avatar).on('response', function(res) {

      if (res.statusCode < 200 || res.statusCode > 300) {
        deferred.reject(new Error('There was an error fetching your image!'));
      }

      res.setEncoding('binary');
      res.on('data', function(chunk){
        data += chunk;
      });

      res.on('end', function() {
	deferred.resolve(['image/jpeg', data]);
      });

      res.on('error', deferred.reject);
      
    }).end();

    return deferred.promise;    
  },
  
}

module.exports = mongoose.model('User', User);


