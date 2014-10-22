Message = require('../model/message')
ObjectId = require('mongoose').Types.ObjectId
multiparty = require('multiparty')

knox = require('knox').createClient
  key: process.env.AWS_KEY
  secret: process.env.AWS_SECRET
  bucket: 'com.fastchat.dev.messages'

exports.getMessages = (req, res, next)->
  idParam = req.params.id.toString()
  groupid = new ObjectId(idParam)
  page = req.query.page
  user = req.user

  Message.fromGroup(user, groupid, page)
    .then (messages)->
      res.json(messages)
    .fail(next)
    .done()

# file.media
# /group/:id/message
exports.postMessageData = (req, res, next)->
  user = req.user
  form = new multiparty.Form()
  groupId = new ObjectId(req.params.id.toString())

  return next(404) unless user.hasGroup(groupId)

  form.parse req, (err, fields, files)->
    Message.postMedia(groupId, user, fields, files)
      .then (message)->
        res.json(message)
      .fail(next)
      .done()


exports.getMessageData = (req, res, next)->
  groupId = new ObjectId(req.params.id.toString())
  messageId = new ObjectId(req.params.mesId.toString())

  return next(404) unless req.user.hasGroup(groupId)

  Message.findOneQ(_id: messageId).then (message)->
    return next(404) unless message
    return next(404) unless message.group.equals(groupId)
    message.getMedia()
  .spread (contentType, contentLength, data)->
    res.contentType(contentType)
    res.set('Content-Length', contentLength)
    res.write(data, encoding='binary')
    res.end()
  .fail(next)
  .done()
