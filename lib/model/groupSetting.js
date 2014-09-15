var mongoose = require('mongoose-q')()
  , Schema = mongoose.Schema;

var GroupSetting = new Schema({
  user: {type: Schema.Types.ObjectId, ref: 'User'},
  group: {type: Schema.Types.ObjectId, ref: 'Group'},
  lastRead: {type: Schema.Types.ObjectId, ref: 'Message'},
  notifications: {type: Boolean, default: true},
  unread: {type: Number, default: 0}
});


GroupSetting.methods = {

  read: function() {
    this.unread = 0;
    return this.saveQ();
  },
  
};


GroupSetting.statics = {

  totalUnread: function(maybe) {
    if (maybe instanceof User) {

    }

    if (Array.isArray(maybe)) {
      
    }

    
    var total = 0;
    gses.forEach(function(gs) {
      total += gs.unread;
    });
    return total;
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
