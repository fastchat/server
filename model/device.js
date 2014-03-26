var mongoose = require('mongoose')
  , Schema = mongoose.Schema;
var apn = require('apn');

var Device = new Schema({
  user: {type: Schema.Types.ObjectId, ref: 'User'},
  token: String,
  type: String,
  lastActiveDate: Date,
  failedAttempts: Number
});

Device.methods.send = function(message) {
  var options = { 
    'gateway': 'gateway.sandbox.push.apple.com'
  };

  var apnConnection = new apn.Connection(options);
  var device = new apn.Device(this.token);
  var note = new apn.Notification();

  note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
  note.badge = 1;
  note.sound = "ping.aiff";
  note.alert = message;
  note.payload = {'messageFrom': 'Someone'};

  apnConnection.pushNotification(note, device);
};

module.exports = mongoose.model('Device', Device);
