var mongoose = require('mongoose-q')()
  , Schema = mongoose.Schema
  , Boom = require('boom')
  , GroupSetting = require('./groupSetting')
  , Q = require('q')
  , fs = require('fs')
  , uuid = require('uuid')
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

  postMedia: function(groupId, user, fields, files) {
    var self = this;
    var deferred = Q.defer();

    if (!files) return deferred.reject('File was not successfully uploaded!');
    if (!files.media) return deferred.reject('Media was not successfully uploaded!');

    var file = files.media[0];
    if (!file) return deferred.reject('File was not successfully uploaded!');

    var stream = fs.createReadStream(file.path)
    var s3req;
    var ext = fileExtension(file.originalFilename);
    var randomName = uuid.v4() + (ext ? ('.' + ext) : '');
    var Group = require('./group');
    var io = require('../socket/socket');

    s3req = knox.putStream(stream, randomName, {
      'Content-Type': file.headers['content-type'],
      'Cache-Control': 'max-age=604800',
      'x-amz-acl': 'public-read',
      'Content-Length': file.size
    },
      function(err, result) {
	if (err) return deferred.reject('There was an error uploading your image!');

	/// Add media name to the message to get later
	var message = new self({
	  'group': groupId,
	  'from': user._id,
	  'text': (fields.text ? fields.text[0] : null),
	  'sent': new Date(),
	  'hasMedia': true,
	  'media': [result.req.path.replace(/^.*[\\\/]/, '')],
	  'mediaHeader': [file.headers['content-type']],
	  'media_size': [file.size]
	});
	message.saveQ().then(function() {
	  return Group.findOneQ({_id: groupId});
	}).then(function(group) {
	  group.messages.push(message);
	  return group.saveQ()
	}).then(function() {
	  io.messageToGroup(user._id, groupId, 'message', message);
	  return message;
	})
	.then(deferred.resolve)
	.fail(deferred.reject)
	.done();
      });

    s3req.on('response', function(s3res) {
      if (s3res.statusCode < 200 || s3res.statusCode >= 300) {
	return deferred.reject({'error' : 'There was an error uploading your image!'});
      };
    }); //knox PUT Stream
    
    s3req.on('error', function(s3err) {
      console.log(s3err);
      console.trace();
    });

    return deferred.promise;
  }
  
};

function fileExtension(filename) {
  return filename.split('.').pop();
}

Message.methods = {

  getMedia: function() {
    if (!this.hasMedia) throw 'This message is not set to have media!';

    var data = '';
    var deferred = Q.defer();
    var self = this;
    knox.get(this.media).on('response', function(s3res){

      if (s3res.statusCode < 200 || s3res.statusCode > 300) {
        return deferred.reject('There was an error fetching your image!');
      }

      s3res.setEncoding('binary');
      s3res.on('data', function(chunk){
        data += chunk;
      });

      s3res.on('end', function() {
	if (self.media.length == 0 || self.mediaHeader.length == 0) {
	  return deferred.reject('No Media on this message!');
	}

	deferred.resolve([self.mediaHeader[0], self.media_size, data]);
      });
    }).end();

    return deferred.promise;
  },


};


module.exports = mongoose.model('Message', Message);
