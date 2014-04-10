var mongoose = require('mongoose')
  , Schema = mongoose.Schema;

var AndroidVersion = new Schema({
  version: {type: String},
  created: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AndroidVersion', AndroidVersion);
