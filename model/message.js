var mongoose = require('mongoose')
  , Schema = mongoose.Schema;

var Message = new Schema({
  from: {type: Schema.Types.ObjectId, ref: 'User'},
  group: {type: Schema.Types.ObjectId, ref: 'Group'},
  text: String,
  sent: Date,
  type: {type: String, default: 'message'},
  hasMedia: {type: Boolean, default: false},
  media: {type: String, default: null},
});



///
/// Have some nice methods for fetching media?
///

module.exports = mongoose.model('Message', Message);
