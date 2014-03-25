var mongoose = require('mongoose')
  , Schema = mongoose.Schema;

var Device = new Schema({
  user: {type: Schema.Types.ObjectId, ref: 'User'},
  token: String,
  type: String,
  lastActiveDate: Date,
  failedAttempts: Number
});
