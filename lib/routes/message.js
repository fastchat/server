var Message = require('../model/message');
var ObjectId = require('mongoose').Types.ObjectId;
var multiparty = require('multiparty');

var knox = require('knox').createClient({
    key: process.env.AWS_KEY,
    secret: process.env.AWS_SECRET,
    bucket: 'com.fastchat.dev.messages'
});

exports.getMessages = function(req, res, next) {
  var idParam = req.params.id.toString();
  var groupid = new ObjectId(idParam);
  var page = req.query.page;
  var user = req.user;

  Message.fromGroup(user, groupid, page)
    .then(function(messages) {
      res.json(messages);
    })
    .fail(next)
    .done();
};

//file.media
// /group/:id/message
exports.postMessageData = function(req, res, next) {

  var user = req.user;
  var form = new multiparty.Form();
  var groupId = new ObjectId(req.params.id.toString());

  if ( !user.hasGroup(groupId) ) return next(404);

  form.parse(req, function(err, fields, files) {
    Message.postMedia(groupId, user, fields, files)
      .then(function(message) {
	res.json(message);
      })
      .fail(next)
      .done();
  });
};


exports.getMessageData = function(req, res, next) {

  var groupId = new ObjectId(req.params.id.toString());
  var messageId = new ObjectId(req.params.mesId.toString());

  if ( !req.user.hasGroup(groupId) ) return next(404);

  Message.findOneQ({ '_id': messageId }).then(function(message) {
    if (!message) return next(404);
    if (!message.group.equals(groupId)) return next(404);
    return message.getMedia();
  }).spread(function(contentType, contentLength, data) {
    res.contentType(contentType);
    res.set('Content-Length', contentLength);
    res.write(data, encoding='binary')
    res.end()
  })
  .fail(next)
  .done();

}



