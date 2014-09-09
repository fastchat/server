var mongoose = require('mongoose-q')()
  , Schema = mongoose.Schema
  , apn = require('apn')
  ,  gcm = require('node-gcm')
  , Boom = require('Boom')
  , IOS_DEFAULT_SOUND = "ping.aiff";


var apnConnection = new apn.Connection({});
var sender = new gcm.Sender('AIzaSyCmtVuvS3OlV801Mlq8IJDXOnsOXA502xA');

/**
 * Holds the information about a device. This is used to be able to run smart
 * notifications. We can send notifications to the "last active device" and
 * then wait to send to the rest.
 *
 * type Should be either 'ios' or 'android'. Used to send notifications to the
 * correct gateways. More can be added later.
 */
var DeviceSchema = new Schema({
  user: {type: Schema.Types.ObjectId, ref: 'User'},
  accessToken: {type: String, default: ''},
  loggedIn: {type: Boolean, default: true},
  active: {type: Boolean, default: true},
  token: String,
  type: String,
  lastActiveDate: Date,
  failedAttempts: Number
});

/**
 * Sends a string to the device.
 * Sets some nice defaults, and takes care of sending to APN or GCM.
 *
 * @message A string to send to the user in a notification.
 */
DeviceSchema.methods = {

  send: function(group, message, badge, contentAvailable) {
    if (!this.active || !this.loggedIn) return;
    
    if (this.type === 'android') {
      this.sendAndroid(group, message, badge);
    } else if (this.type === 'ios') {
      this.sendIOS(group, message, badge, contentAvailable);
    }
  },

  sendAndroid: function(group, message, badge, contentAvailable) {
    var data = {};
    if (group) data.group = group._id;
    if (message) data.text = message;
    if (badge) data.alert = badge;
    data.sound = IOS_DEFAULT_SOUND;

    var message = new gcm.Message({
      'data': data
    });

    var registrationIds = [];
    registrationIds.push(this.token); 

    console.log('Android Message: ' + JSON.stringify(message, null, 4));
    
    sender.send(message, registrationIds, 4, function (err, result) {
      console.log('GCM: ', result, ' Err? ', err);
    });
  },

  sendIOS: function(group, message, badge, contentAvailable) {
    //    var options = { 
    //      'gateway': 'gateway.sandbox.push.apple.com'
    //    };

    if (!badge) badge = 0;
    
    var device = null;
    try {
      device = new apn.Device(this.token);
    } catch (err) {
      return;
    }

    var note = new apn.Notification();
    note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
    if (badge || badge === 0) note.badge = badge;
    if (message) note.alert = message;
    if (group) note.payload = {'group': group._id};
    if (contentAvailable) {
      note.setContentAvailable(true);
    } else {
      note.sound = IOS_DEFAULT_SOUND;
    }
    
    console.log('FIRING AWAY: ', note, ' TO: ', this.token);

    apnConnection.pushNotification(note, device);
  }
};


DeviceSchema.statics = {

  createOrUpdate: function(user, token, type, sessionToken) {

    if (!token) {
      console.log('Didnt send Token: ', token);
      throw Boom.badRequest('You must specify a token to register a device!');
    }

    if (!type || (type !== 'ios' && type !== 'android')) {
      console.log('Bad type: ', type);
      throw Boom.badRequest('Type must be "ios" or "android"!');
    }

    var self = this;

    return self.findQ({'token' : token, 'user' : user._id})
      .then(function(devices) {
	console.log('Devices Found with Token: ', devices);
	
	if (devices && devices.length > 0) {
	  devices.forEach(function(device) {
	    //update the session-token associated with it.
	    device.accessToken = sessionToken;
	    device.active = true;
	    device.loggedIn = true;
	    device.saveQ();
	  });
	  return null;
	}

	var device = new self({'token': token,
			       'type': type,
			       'user': user._id,
			       'accessToken': sessionToken
			      });

	return device.saveQ()
	  .then(function() {
	    user.devices.push(device);
	    return user.saveQ()
	      .then(function() {
		return device;
	      });
	  });
      });
  }
};

module.exports = mongoose.model('Device', DeviceSchema);
