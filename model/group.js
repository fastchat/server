var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , Hash = require('hashish');

var Group = new Schema({
  members : [{ type: Schema.Types.ObjectId, ref: 'User' }],
  messages : [{type: Schema.Types.ObjectId, ref: 'Message'}],
  name : String,
  invites : [{type: Schema.Types.ObjectId, ref: 'User'}]
});

// cb(err, group)
Group.statics.newGroup = function(data, user, cb) {  
  var options = Hash.merge({name: 'New Group', members: [user._id], messages: []}, data || {});
  var group = new this(options);
  group.save(function(groupErr) {
    if (groupErr) return cb(groupErr);

    user.groups.push(group._id);
    user.save(function(userErr) {
      cb(userErr, group);
    });
  });
};


module.exports = mongoose.model('Group', Group);
