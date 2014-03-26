var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , Hash = require('hashish');

/**
 * Group
 * The group holds informatiom about the participants. Each group knows of
 * it's members (Users), and has a list of all the messages sent in the group.
 * It has a name that can be changed, and knows who has been invited to the group
 * (so invites can be cleared later).
 */
var Group = new Schema({
  members : [{ type: Schema.Types.ObjectId, ref: 'User' }],
  messages : [{type: Schema.Types.ObjectId, ref: 'Message'}],
  name : String,
  invites : [{type: Schema.Types.ObjectId, ref: 'User'}]
});


/**
 * Helper method to create a new group. Ensures that the information passed in
 * is correct.
 *
 * @data A object that is used to pull the data out for the group. Merged into a default
 * hash.
 * @user The user who creates the group. He is added to the group by default.
 * @cb Callback(Error, Group)
 */
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
