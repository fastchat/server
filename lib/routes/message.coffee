'use strict'
#
#
#
#
#

Message = require('../model/message')
ObjectId = require('mongoose').Types.ObjectId
multiparty = require('multiparty')
Boom = require 'boom'
NotFound = Boom.notFound

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
  {text, media} = req.payload

  groupId = new ObjectId(req.params.id)
  return NotFound() unless user.hasGroup(groupId)

  Message.postMedia(groupId, user, text: text, media)
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
    handler: getMessages
  }
  {
    method: 'POST'
    path: '/group/{id}/message'
    config:
      handler: postMessageData
      payload:
        output: 'file'
  }
  {
    method: 'GET'
    path: '/group/{id}/message/{mesId}/media'
    handler: getMessageData
  }
]
