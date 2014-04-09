var mongoose = require('mongoose')
  , Schema = mongoose.Schema;

var GroupSetting = new Schema({
  user: {type: Schema.Types.ObjectId, ref: 'User'},
  group: {type: Schema.Types.ObjectId, ref: 'Group'},
  lastRead: {type: Schema.Types.ObjectId, ref: 'Message'},
  notifications: {type: Boolean, default: true},
  unread: {type: Number, default: 0}
});


GroupSetting.statics.totalUnread = function(gses) {
  var total = 0;
  gses.forEach(function(gs) {
    total += gs.unread;
  });
  return total;
};

GroupSetting.statics.forGroup = function(gses, groupId) {

  console.log('GroupSettings: ID: ' + JSON.stringify(groupId, null, 4));

  for (var i = 0; i < gses.length; i++) {
    console.log('GroupSettings: WHAT: ' + JSON.stringify(gses[i], null, 4));
    if (gses[i].group.equals(groupId)) return gses[i];
  }
  return null;
};


module.exports = mongoose.model('GroupSetting', GroupSetting);
