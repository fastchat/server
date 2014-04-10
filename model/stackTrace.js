var mongoose = require('mongoose')
  , Schema = mongoose.Schema;

var StackTrace = new Schema({
  androidVersion: {type: Schema.Types.ObjectId, ref: 'AndroidVersion'},
  trace: String,
  created: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StackTrace', StackTrace);
