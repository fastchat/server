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
  var total = 0;
  gses.forEach(function(gs) {
    total += gs.unread;
  });
  return total;
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
      return Q(calculateTotal(maybe));
    }
    return Q(0);
  },

  
  forGroup: function(gses, groupId) {

    console.log('GroupSettings: ID: ' + JSON.stringify(groupId, null, 4));

    for (var i = 0; i < gses.length; i++) {
      console.log('GroupSettings: WHAT: ' + JSON.stringify(gses[i], null, 4));
      if (gses[i].group.equals(groupId)) return gses[i];
    }
    return null;
  },

};


module.exports = mongoose.model('GroupSetting', GroupSetting);
