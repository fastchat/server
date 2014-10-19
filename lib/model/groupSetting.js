var mongoose = require('mongoose-q')()
, Schema = mongoose.Schema
, User = require('./user')
, Q = require('q');

var GroupSetting = new Schema({
  user: {type: Schema.Types.ObjectId, ref: 'User'},
  group: {type: Schema.Types.ObjectId, ref: 'Group'},
  lastRead: {type: Schema.Types.ObjectId, ref: 'Message'},
  notifications: {type: Boolean, default: true},
  unread: {type: Number, default: 0}
});

var calculateTotal = function(gses) {
  console.log('Calculating');
  return gses.reduce(function (a, b) { return a + b.unread; }, 0);
};


GroupSetting.methods = {

  read: function() {
    this.unread = 0;
    return this.saveQ();
  },
  
};

GroupSetting.statics = {

  totalUnread: function() { //just use arguments
    if (arguments.length == 0) return Q(0);
    var arg = arguments[0]
    
    console.log('Maybe', arg);
    if (arg instanceof User) {
      return this.findQ({'user': arg._id}).then(function(gses) {
	return calculateTotal(gses);
      });
    }

    if (Array.isArray(arg)) {
      console.log('Array');
      return Q(calculateTotal(arg));
    }
    return Q(0);
  },

  
  forGroup: function(gses, groupId) {

    console.log('GroupSettings: ID: ' + JSON.stringify(groupId, null, 4));

    for (var i = 0; i < gses.length; i++) {
      if (gses[i].group.equals(groupId)) return gses[i];
    }
    return null;
  },

};


module.exports = mongoose.model('GroupSetting', GroupSetting);
