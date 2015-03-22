Message = require('../model/message')
ObjectId = require('mongoose').Types.ObjectId
multiparty = require('multiparty')
Boom = require 'boom'
NotFound = Boom.notFound

knox = require('knox').createClient
  key: process.env.AWS_KEY
  secret: process.env.AWS_SECRET
  bucket: 'com.fastchat.dev.messages'

getMessages = (req, reply)->
  idParam = req.params.id
  groupid = new ObjectId(idParam)
  page = req.query.page
  {user} = req.auth.credentials

  Message.fromGroup(user, groupid, page)
    .then (messages)->
      reply(messages)
    .fail(reply)
    .done()

# file.media
# /group/:id/message
postMessageData = (req, reply)->
  {user} = req.auth.credentials
  form = new multiparty.Form()
  groupId = new ObjectId(req.params.id)

  return NotFound() unless user.hasGroup(groupId)

  form.parse req.raw.req, (err, fields, files)->
    Message.postMedia(groupId, user, fields, files)
      .then (message)->
        reply(message)
      .fail(reply)
      .done()


getMessageData = (req, reply)->
  {user} = req.auth.credentials
  groupId = new ObjectId(req.params.id)
  messageId = new ObjectId(req.params.mesId)

  return NotFound() unless user.hasGroup(groupId)

  Message.findOneQ(_id: messageId).then (message)->
    return NotFound() unless message
    return NotFound() unless message.group.equals(groupId)
    message.getMedia()
  .spread (contentType, contentLength, data)->
    reply(data).type(contentType)
  .fail(reply)
  .done()


module.exports = [
  {
    method: 'GET'
    path: '/group/{id}/message'
    handler: getAvatar
  }
  {
    method: 'POST'
    path: '/group/{id}/message'
    handler: getAvatar
  }
  {
    method: 'GET'
    path: '/group/{id}/message/{mesId}/media'
    handler: getMessageData
  }
]
