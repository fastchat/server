var mongoose = require('mongoose-q')()
  , Schema = mongoose.Schema
  , Hash = require('hashish')
  , Boom = require('boom')
  , GroupSetting = require('./groupSetting');

/**
 * Group
 * The group holds informatiom about the participants. Each group knows of
 * it's members (Users), and has a list of all the messages sent in the group.
 * It has a name that can be changed, and knows who has been invited to the group
 * (so invites can be cleared later).
 */
var Group = new Schema({
  members : [{ type: Schema.Types.ObjectId, ref: 'User' }],
  leftMembers : [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  messages : [{type: Schema.Types.ObjectId, ref: 'Message', default: [] }],
  lastMessage : { type: Schema.Types.ObjectId, ref: 'Message', default: null },
  name : {type: String, default: null}
});

var virtual = Group.virtual('fullname');

Group.virtual('unread').get(function() {
  return this._unread ? this._unread : 0;
});

Group.virtual('unread').set(function(unread) {
  return this._unread = unread;
});

Group.set('toObject', {
  getters: true
});

Group.set('toJSON', { 
  getters: true, 
  virtuals: true
});


/*
 * Sort
 * Sorts two objects, a and b, by their lastMessage.sent 
 * property. If It doesn't exist on either object, then the
 * other is returned higher.
 */
var sort = function(a, b) {
  var first;
  if (a.lastMessage) {
    first = a.lastMessage.sent;
  } else {
    return 1;
  }
  var second;
  if (b.lastMessage) {
    second = b.lastMessage.sent;
  } else {
    return -1;
  }

  return ((first < second) ? 1 : ((first > second) ? -1 : 0));
}


Group.methods = {
  
};

Group.statics = {

  /**
   * Gets the groups (and their unread count) for the user.
   */ 
  groupsForUser: function(user) {
    if (!user) throw Boom.unauthorized();
    
    return GroupSetting.find({'user': user._id}).then(function(gses) {
      return Group.find({'members' : user._id}, '_id members leftMembers name lastMessage')
        .populate('members', 'username, avatar')
	.populate('leftMembers', 'username avatar')
	.populate('lastMessage')
	.execQ(function(groups) {
	  groups.sort(sort);

	  /// For each group - find the group setting object associated with it
	  /// and if it exists, add the unread count to this group
	  groups.forEach(function(g) {
	    var index = gses.indexOfEquals(g._id, 'group');
	    if (index > -1) {
	      g.unread = gses[index].unread;
	    } else {
	      g.unread = 0;
	    }
	  });

	  return groups;
	});
    });
  },  

  /**
   * Helper method to create a new group. Ensures that the information passed in
   * is correct.
   *
   * @data A object that is used to pull the data out for the group. Merged into a default
   * hash.
   * @user The user who creates the group. He is added to the group by default.
   * @cb Callback(Error, Group)
   */
  newGroup: function(data, cb) {
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
  }

}

module.exports = mongoose.model('Group', Group);
