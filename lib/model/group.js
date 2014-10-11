var mongoose = require('mongoose-q')()
  , Schema = mongoose.Schema
  , Hash = require('hashish')
  , Boom = require('boom')
  , Q = require('q')
  , Message = require('./message')
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

    var self = this;

    return Q.all([
      GroupSetting.findQ({'user': user._id}),
      self.find({'members' : user._id}, '_id members leftMembers name lastMessage')
        .populate('members', 'username, avatar')
	.populate('leftMembers', 'username avatar')
	.populate('lastMessage')
	.execQ()
    ]).spread(function(gses, groups) {
      if (!groups) return Q([]);
      
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
  },  


  validateMembers: function(members, user) {
    var members = members.map(function(name) {return name.toLowerCase()});
    var User = require('./user');
    
    return User.find({'username': { $in: members } }).execQ()
      .then(function(users) {
      if (users.length === 0) throw Boom.badRequest('No users were found with those usernames!');

      var otherMembers = users.filter(function(u) {return !u._id.equals(user._id)});
      if (otherMembers.length === 0) {
	throw Boom.badRequest('You can\'t make a group with only yourself!');
      }

      return otherMembers;
    });
  },

  
  /**
   * Helper method to create a new group. Ensures that the information passed in
   * is correct.
   *
   * @param Members - Required array of members who will be in the group
   * @param user - The user who created the group
   * @param message - Optional. The starting message for the group
   * param name - Optional. The name for the group
   */
  newGroup: function(members, user, message, name) {
    var self = this;

    if (typeof(members) == 'undefined' || members == null || !Array.isArray(members) || members.length === 0) {
      throw Boom.badRequest('The "members" value must be a valid array of length 1!');
    }

    if (!user) throw Boom.unauthorized();

    if (!message) {
      message = 'Hello!';
    }

    console.log('Got here');

    return self.validateMembers(members, user).then(function(members) {
      console.log('1');
      var membersWithUser = members.slice(0);
      membersWithUser.push(user);
      return [members, membersWithUser, new self({name: name, members: membersWithUser})]
    }).spread(function(members, membersWithUser, group) {
      console.log('2', group);
      
      membersWithUser.forEach(function(u) {
	u.groups.push(group._id);

	///
	/// Each member in the group gets a GroupSetting object
	///
	var setting = new GroupSetting({
	  'user': u._id,
	  'group': group._id
	});

	setting.saveQ();
	u.groupSettings.push(setting._id);
	u.saveQ();
      });

      console.log('3');
      
      var aMessage = new Message({'from' : user._id,
				'group': group._id,
				'text' : message,
				'sent' : new Date()
				 });
      
      group.messages.push(aMessage._id)
      group.lastMessage = aMessage._id
      return aMessage.saveQ().then(function() {
	return [members, aMessage, group];
      });
    }).spread(function(members, mes, group) {
      console.log('4', group);
      ///
      /// Emit a new message to socket users
      ///
      var text = user.username + '@' + group.name + ': ' + message;
      var usersNotOn = [];
      members.forEach(function(user) {
	if (!require('../socket/socket').emitNewGroup(user._id, group)) {
	  user.push(group, text, null, false);
	}
      });

      console.log('4', group._id);
      
      return group.saveQ().then(function() {
	return self.findOne(
	  { '_id' : group._id },
	  '_id members leftMembers name lastMessage messages')
	  .populate('members', 'username avatar')
	  .populate('leftMembers', 'username avatar')
	  .populate('lastMessage')
	  .execQ().then(function(group) {
	    console.log('FOUND', group);
	    return group;
	  });
      });
    });
  },

};

module.exports = mongoose.model('Group', Group);
