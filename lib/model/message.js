var mongoose = require('mongoose-q')()
  , Schema = mongoose.Schema
  , Boom = require('boom')
  , GroupSetting = require('./groupSetting')
  , PER_PAGE = 30;


var knox = require('knox').createClient({
    key: process.env.AWS_KEY,
    secret: process.env.AWS_SECRET,
    bucket: 'com.fastchat.dev.messages'
});

var Message = new Schema({
  from: {type: Schema.Types.ObjectId, ref: 'User'},
  group: {type: Schema.Types.ObjectId, ref: 'Group'},
  text: String,
  sent: Date,
  type: {type: String, default: 'message'},
  hasMedia: {type: Boolean, default: false},
  media: [{type: String, default: []}], //key for media
  mediaHeader: [{type: String, default: []}], //content-type?
  media_size: [{type: Number, default: []}]
});

Message.statics = {

  fromGroup: function(user, groupid, page) {
    if (!user.hasGroup(groupid)) throw Boom.notFound();
    if (!page) page = 0;
    
    return this.findQ(
      {group: groupid},
      {},
      {
	sort: {sent: -1},
	skip: page * PER_PAGE,
	limit: PER_PAGE
      }
    )
      .then(function(messages) {
	GroupSetting.findOneQ({user: user._id}, {group: groupid})
	  .then(function(gs) {
	    if (gs) {
	      gs.read();
	      user.push(null, null, GroupSetting.totalUnread(gses), true);
	    }
	  });
	return messages;
      });
  },
  
};

Message.methods = {

};


module.exports = mongoose.model('Message', Message);
