var mongoose = require('mongoose')
  , Schema = mongoose.Schema;
var apn = require('apn');

/**
 * Holds the information about a device. This is used to be able to run smart
 * notifications. We can send notifications to the "last active device" and
 * then wait to send to the rest.
 *
 * type Should be either 'ios' or 'android'. Used to send notifications to the
 * correct gateways. More can be added later.
 */
var Device = new Schema({
  user: {type: Schema.Types.ObjectId, ref: 'User'},
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
Device.methods.send = function(message) {
  var options = { 
//    'gateway': 'gateway.sandbox.push.apple.com'
  };

  var apnConnection = new apn.Connection(options);
  var device = new apn.Device(this.token);
  var note = new apn.Notification();

  note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
  note.badge = 1;
  note.sound = "ping.aiff";
  note.alert = message;
  note.payload = {'messageFrom': 'Someone'};

  console.log('FIRING AWAY: ' + JSON.stringify(note, null, 4) + ' TO: ' + this.token);

  apnConnection.pushNotification(note, device);
};

module.exports = mongoose.model('Device', Device);
