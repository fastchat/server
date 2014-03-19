var mongoose = require('mongoose')
  , Schema = mongoose.Schema;

var Message = new Schema({
  from: {type: Schema.Types.ObjectId, ref: 'User'},
  group: {type: Schema.Types.ObjectId, ref: 'Group'},
  text: String,
  sent: Date,
//media
});

module.exports = mongoose.model('Message', Message);
