var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , Hash = require('hashish');
var GroupSetting = require('./groupSetting');

/**
 * Group
 * The group holds informatiom about the participants. Each group knows of
 * it's members (Users), and has a list of all the messages sent in the group.
 * It has a name that can be changed, and knows who has been invited to the group
 * (so invites can be cleared later).
 */
var Group = new Schema({
  members : [{ type: Schema.Types.ObjectId, ref: 'User' }],
  messages : {type: [Schema.Types.ObjectId], ref: 'Message', default: []},
  name : {type: String, default: ''}
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
Group.statics.newGroup = function(data, cb) {

  var members = data.members;

  var group = new this(data);
  group.save(function(groupErr) {
    if (groupErr) return cb(groupErr);

    members.forEach(function(user) {
      user.groups.push(group._id);

      ///
      /// Each member in the group gets a GroupSetting object
      ///
      var setting = new GroupSetting({
	'user': user._id,
	'group': group._id	
      });

      setting.save(function(err) {
	console.log('Error: '+ err);
      });
      user.groupSettings.push(setting._id);
      user.save(function(err) {
	console.log('Error2: '+ err);
      });
    });
    
    cb(null, group);
  });
};

module.exports = mongoose.model('Group', Group);
