var mongoose = require('mongoose')
  , Schema = mongoose.Schema;

var Message = new Schema({
  from: {type: Schema.Types.ObjectId, ref: 'User'},
  group: {type: Schema.Types.ObjectId, ref: 'Group'},
  text: String,
  sent: Date,
  type: {type: String, default: 'message'},
  hasMedia: {type: Boolean, default: false},
  media: [{type: String, default: []}], //key for media
  mediaHeader: [{type: String, default: []}], //content-type?
  media_size: Number
});



///
/// Have some nice methods for fetching media?
///

module.exports = mongoose.model('Message', Message);
