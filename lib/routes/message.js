var User = require('../model/user');
var Message = require('../model/message');
var GroupSetting = require('../model/groupSetting');
var Group = require('../model/group');
var ObjectId = require('mongoose').Types.ObjectId;
var PER_PAGE = 30;
var multiparty = require('multiparty');
var fs = require('fs');
var io = require('../socket/socket');
var uuid = require('uuid');
var knox = require('knox').createClient({
    key: process.env.AWS_KEY,
    secret: process.env.AWS_SECRET,
    bucket: 'com.fastchat.dev.messages'
});

exports.getMessages = function(req, res, next) {
  console.log('1');

  var idParam = req.params.id.toString();
  var groupId = new ObjectId(idParam);
  var page = req.query.page;
  var usr = req.user;

  if (!page) page = 0;

  if ( !usr.hasGroup(groupId) ) return next(404);

  //MyModel.find(query, fields, { skip: 10, limit: 5 }, function(err, results) { ... });
  Message.find( {group: groupId}, {}, {sort: {sent: -1}, skip: page * PER_PAGE, limit: PER_PAGE}, function(err, messages) {
    console.log('ERR: ' + err);
    if (err) return next(404);

    ///
    /// Assuming we found the messages, we should also clear the 'unread' count for this group
    ///
    GroupSetting.find({'user': usr._id}, function(err, gses) {

      var thisGs = GroupSetting.forGroup(gses, groupId);
      if (thisGs) {
	thisGs.unread = 0;
	usr.push(null, null, GroupSetting.totalUnread(gses), true);
	thisGs.save();
      }
    });

    res.json(messages);
  });
};

//file.media
// /group/:id/message
exports.postMessageData = function(req, res, next) {
  console.log('2');

  var user = req.user;
  var form = new multiparty.Form();
  var idParam = req.params.id.toString();
  var groupId = new ObjectId(idParam);

  if ( !user.hasGroup(groupId) ) return next(404);

  form.parse(req, function(err, fields, files) {
    console.log('Fields: ', fields);
    console.log('Files: ', files);
    if (!files) return next('File was not successfully uploaded!');
    if (!files.media) return next('Media was not successfully uploaded!');

    var file = files.media[0]; //for each?
    console.log(file);
    if (!file) return next('File was not successfully uploaded!');

    var stream = fs.createReadStream(file.path)
    var s3req;
    var ext = fileExtension(file.originalFilename);
    var randomName = uuid.v4() + (ext ? ('.' + ext) : '');

    s3req = knox.putStream(stream, randomName, {
      'Content-Type': file.headers['content-type'],
      'Cache-Control': 'max-age=604800',
      'x-amz-acl': 'public-read',
      'Content-Length': file.size
    },
      function(err, result) {
	console.log('Result', result);
	if (err) return next('There was an error uploading your image!');

	/// Add media name to the message to get later
	var message = new Message({
	  'group': groupId,
	  'from': user._id,
	  'text': (fields.text ? fields.text[0] : null),
	  'sent': new Date(),
	  'hasMedia': true,
	  'media': [result.req.path.replace(/^.*[\\\/]/, '')],
	  'mediaHeader': [file.headers['content-type']],
	  'media_size': [file.size]
	});
	message.save(function(err) {
	  Group.findOne({_id: groupId}, function(err, group) {
	    group.messages.push(message);
	    group.save(function(err) {
	      if (err) {
		console.log('Error Saving Group', err);
              }
              io.messageToGroup(groupId, 'message', message);
	    });
	    return res.json(201, message);

	  });
	});
      });

    s3req.on('response', function(s3res){
      if (s3res.statusCode < 200 || s3res.statusCode >= 300) {
	       return res.json(s3res.statusCode, {'error' : 'There was an error uploading your image!'});
      };

    }); //knox PUT Stream
    s3req.on('error', function(s3err) {
      console.log(s3err);
      console.trace();
    });

  }); //Form Parse
};


exports.getMessageData = function(req, res, next) {

  var idParam = req.params.id.toString();
  var groupId = new ObjectId(idParam);
  var messageIdParam = req.params.mesId.toString();
  var messageId = new ObjectId(messageIdParam);
  var user = req.user;

  if ( !user.hasGroup(groupId) ) return next(404);

  Message.findOne({'_id':messageId}, function(err, message) {
    if (!message) return next(404);
    if (!message.group.equals(groupId)) return next(404);
    if (!message.hasMedia) return next('This message is not set to have media!');

    /// User belongs to the group, and the message is in it, and it has media. Get it.

    var data = '';
    knox.get(message.media).on('response', function(s3res){

      if (s3res.statusCode < 200 || s3res.statusCode > 300) {
        return next('There was an error fetching your image!');
      }

      s3res.setEncoding('binary');
      s3res.on('data', function(chunk){
        data += chunk;
      });

      s3res.on('end', function() {
	console.log('Mesage: ', message);

	if (message.media.length == 0 || message.mediaHeader.length == 0)
	  return next('No Media on this message!');

	//this will have to change with multiple files
	var type = message.mediaHeader[0];
        res.set('Content-Length', message.media_size);
        res.contentType(type);
        res.write(data, encoding='binary')
        res.end()
      });
    }).end();

  });//end Find Message
}


function fileExtension(filename) {
  return filename.split('.').pop();
}
