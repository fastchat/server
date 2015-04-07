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
Joi = require 'joi'
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
    config:
      handler: getMessages
      description: 'Gets the messages for the given group.'
      notes: "Gets the messages for the given group. You can use the parameter values to
      go back further in time. The messages are returned in the order of: Most recent
      message is at the lower index. This means that if you get the 30 most recent messages
      then the message at index 0 is the *most recent* message sent. Clients may have to
      reverse the order of the messages before inserting it into their list.

      This route requires the user's access token, either as a query param,
      or a header, but not both.
      The header format must be: authorization: Bearer {token}
      The query format must be: access_token={token}"
      tags: ['api']
      plugins:
        'hapi-swagger':
          responseMessages: [
            {
              code: 400
              message: 'Bad Request. Occurs when you fail to give the required data.'
            }
            {
              code: 401
              message: 'Unauthorized'
            }
            {
              code: 404
              message: "Not Found. Occurs if you try to access a group you don't have access to."
            }
          ]
      validate:
        params:
          id:
            Joi.string().regex(/^[0-9a-f]{24}$/)
        query:
          access_token: Joi.string().min(1).lowercase().trim().when(
            '$headers.authorization', {
              is: Joi.exist(),
              otherwise: Joi.forbidden()
            })
          page: Joi.number().integer().min(0).optional().default(0)
        headers: Joi.object({
          authorization: Joi.string().trim().regex(/^Bearer\s[a-zA-Z0-9]+$/).when(
            '$query.access_token', {
              is: Joi.forbidden(),
              otherwise: Joi.exist()
            }
          )
        }).unknown()
      response:
        schema:
          Joi.array().items(
            Joi.object({
              _id: Joi.required().description("The id for the message")
              from: Joi.required().description("The user id this message is from.
              Clients should use this to map the message to the user account stored locally.")
              group: Joi.required().description("The group id this message is from.")
              text: Joi.string().optional().description("The message text may be null if they
              didn't type anything, and just sent a picture.")
              sent: Joi.date().required()
              type: Joi.string().required().description("This will almost always be 'message',
              but sometimes may be 'system' or the name of an integration.")
              hasMedia: Joi.boolean().required()
              media: Joi.array().items(Joi.string())
              mediaHeader: Joi.array().items(Joi.string())
              media_size: Joi.array().items(Joi.number())
            }).meta({
              className: 'Message'
            }).unknown()
          )
  }
  {
    method: 'POST'
    path: '/group/{id}/message'
    config:
      handler: postMessageData
      payload:
        output: 'file'
      description: 'Uploads media for a message.'
      notes: "Media is not sent through socket.io, but rather uploaded as a
      regular HTTP request. To ensure your message and image are delivered at the same
      time, if you are sending a media message, you don't send it via socket.io at all,
      but rather upload it here. Once the upload has completed, the server will internally
      broadcast the message (with the appropriate media settings on it) to the clients
      in the room. The clients can then view the message and download the media content.

      This route requires the user's access token, either as a query param,
      or a header, but not both.
      The header format must be: authorization: Bearer {token}
      The query format must be: access_token={token}"
      tags: ['api']
      plugins:
        'hapi-swagger':
          payloadType: 'form'
          responseMessages: [
            {
              code: 400
              message: 'Bad Request. Occurs when you fail to give the required data.'
            }
            {
              code: 401
              message: 'Unauthorized'
            }
            {
              code: 501
              message: "Not Implemented. This indicates that the server does not have
              acess to the AWS_KEY and AWS_SECRET, or was configured incorrectly."
            }
          ]
      validate:
        params:
          id:
            Joi.string().regex(/^[0-9a-f]{24}$/)
        query:
          access_token: Joi.string().min(1).lowercase().trim().when(
            '$headers.authorization', {
              is: Joi.exist(),
              otherwise: Joi.forbidden()
            })
        headers: Joi.object({
          authorization: Joi.string().trim().regex(/^Bearer\s[a-zA-Z0-9]+$/).when(
            '$query.access_token', {
              is: Joi.forbidden(),
              otherwise: Joi.exist()
            }
          )
        }).unknown()
        payload:
          text: Joi.string()
          media: Joi.required().meta(swaggerType: 'file')
      response:
        schema:
          Joi.object({
            _id: Joi.required().description("The id for the message")
            from: Joi.required().description("The user id this message is from.
            Clients should use this to map the message to the user account stored locally.")
            group: Joi.required().description("The group id this message is from.")
            text: Joi.string().optional().description("The message text may be null if they
            didn't type anything, and just sent a picture.")
            sent: Joi.date().required()
            type: Joi.string().required().description("This will almost always be 'message',
            but sometimes may be 'system' or the name of an integration.")
            hasMedia: Joi.boolean().required()
            media: Joi.array().items(Joi.string())
            mediaHeader: Joi.array().items(Joi.string())
            media_size: Joi.array().items(Joi.number())
          }).meta({
            className: 'Message'
          }).unknown()
  }
  {
    method: 'GET'
    path: '/group/{id}/message/{mesId}/media'
    config:
      handler: getMessageData
      description: 'Gets the media from a given message'
      notes: "Media (pictures, videos, audio), are not sent through socket.io in
      real time, but must be fetched once the message has been transmitted through
      socket.io. This will return the content-type as the header.

      This route requires the user's access token, either as a query param,
      or a header, but not both.
      The header format must be: authorization: Bearer {token}
      The query format must be: access_token={token}"
      tags: ['api']
      plugins:
        'hapi-swagger':
          responseMessages: [
            {
              code: 400
              message: 'Bad Request. Occurs when you fail to give the required data.'
            }
            {
              code: 401
              message: 'Unauthorized'
            }
            {
              code: 404
              message: "Not Found. Occurs when you attempt to access an image you don't have
              access to."
            }
            {
              code: 501
              message: "Not Implemented. This indicates that the server does not have
              acess to the AWS_KEY and AWS_SECRET, or was configured incorrectly."
            }
          ]
      validate:
        params:
          id:
            Joi.string().regex(/^[0-9a-f]{24}$/)
          mesId:
            Joi.string().regex(/^[0-9a-f]{24}$/)
        query:
          access_token: Joi.string().min(1).lowercase().trim().when(
            '$headers.authorization', {
              is: Joi.exist(),
              otherwise: Joi.forbidden()
            })
        headers: Joi.object({
          authorization: Joi.string().trim().regex(/^Bearer\s[a-zA-Z0-9]+$/).when(
            '$query.access_token', {
              is: Joi.forbidden(),
              otherwise: Joi.exist()
            }
          )
        }).unknown()
  }
]
