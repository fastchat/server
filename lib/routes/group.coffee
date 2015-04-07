'use strict'
#
# FastChat
# 2015
#

Group = require('../model/group')
ObjectId = require('mongoose-q')().Types.ObjectId
Boom = require('boom')
Joi = require 'joi'

getGroups = (req, reply)->
  {user} = req.auth.credentials
  Group.groupsForUser(user).then (groups)->
    reply(groups)
  .fail(reply)
  .done()

createGroup = (req, reply)->
  {user} = req.auth.credentials
  Group.newGroup(req.payload.members, user, req.payload.text, req.payload.name)
  .then (group)->
    reply(group).code(201)
  .fail(reply)
  .done()

# PUT /group/:id/leave
leaveGroup = (req, reply)->
  {user} = req.auth.credentials
  id = new ObjectId(req.params.id)

  Group.findOneQ(_id: id).then (group)->
    throw Boom.notFound() unless group
    group.leave(user)
  .then ->
    reply({})
  .fail(reply)
  .done()

changeSettings = (req, reply)->
  {user} = req.auth.credentials
  groupId = new ObjectId(req.params.id)

  return reply(Boom.notFound()) unless user.hasGroup(groupId)

  Group.findOneQ(_id: groupId).then (group)->
    throw Boom.notFound() unless group
    group.changeName req.payload.name, user
  .then ->
    reply({})
  .fail(reply)
  .done()

add = (req, reply)->
  {user} = req.auth.credentials
  invites = req.payload.invitees
  groupId = new ObjectId(req.params.id)

  return reply Boom.notFound() unless user.hasGroup(groupId)

  Group.findOneQ(_id: groupId).then (group)->
    throw Boom.notFound() unless group
    group.add(invites)
  .then ->
    reply({})
  .fail(reply)
  .done()

module.exports = [
  {
    method: 'GET'
    path: '/group'
    config:
      handler: getGroups
      description: 'Gets the groups for the current user.'
      notes: "Gets the groups for the current logged in user.

      This route requires the user's access token, either as a query param,
      or a header, but not both.
      The header format must be: authorization: Bearer {token}.
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
          ]
      validate:
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
      response:
        schema:
          Joi.array().items(
            Joi.object({
              members: Joi.array().items(
                Joi.object({
                  _id: Joi.required().description("The unique id for the user")
                  username: Joi.string().required()
                  avatar: Joi.optional()
                }).unknown()
              )
              leftMembers: Joi.array().items(
                Joi.object({
                  _id: Joi.required().description("The unique id for the user")
                  username: Joi.string().required()
                  avatar: Joi.optional()
                }).unknown()
              )
              lastMessage: Joi.object({
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
              name: Joi.optional()
            }).meta({
              className: 'Group'
            }).unknown()
          )
  }
  {
    method: 'POST'
    path: '/group'
    config:
      handler: createGroup
      description: 'Creates a new group'
      notes: "Creates a new group with the members in it, and an optional first message
      sent. This is similar to how iMessage would create a group. The client selects the
      members of the group, and it's not really 'created' until you've sent a message
      to all the members.

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
          ]
      validate:
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
          members: Joi.array().items(Joi.string()).required().unique().min(1).description("Usernames of the members to include in the group.")
          text: Joi.string().required().description("The first message to send")
          name: Joi.optional().description("An optional group name")
      response:
        schema:
          Joi.object({
            members: Joi.array().items(
              Joi.object({
                _id: Joi.required().description("The unique id for the user")
                username: Joi.string().required()
                avatar: Joi.optional()
              }).unknown()
            )
            leftMembers: Joi.array().items(
              Joi.object({
                _id: Joi.required().description("The unique id for the user")
                username: Joi.string().required()
                avatar: Joi.optional()
              }).unknown()
            )
            lastMessage: Joi.object({
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
            name: Joi.optional()
          }).meta({
            className: 'Group'
          }).unknown()
  }
  {
    method: 'PUT'
    path: '/group/{id}/leave'
    config:
      handler: leaveGroup
      description: 'Leaves the group'
      notes: "Leaves the given group. A person who has left the group cannot be
      re-added, to stop being forced into a group.

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
              message: 'Not Found'
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
      response:
        schema:
          Joi.object({})
  }
  {
    method: 'PUT'
    path: '/group/{id}/settings'
    config:
      handler: changeSettings
      description: 'Changes the group settings'
      notes: "Allows any user who is in the group to change the group settings. For now,
      the only setting that can be changed is the name of the group. Additional settings
      will be added, and can be used with the new keys.

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
              message: 'Not Found'
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
          name: Joi.string()
      response:
        schema:
          Joi.object({})
  }
  {
    method: 'PUT'
    path: '/group/{id}/add'
    config:
      handler: add
      description: 'Adds users to the group'
      notes: "This will just automatically add the users to the group, without any necessary
      confirmation on their part. You cannot add a user who has left though.

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
              message: 'Not Found'
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
          invitees: Joi.array().items(Joi.string()).required().unique().min(1).description("Usernames of the members to add to the group.")
      response:
        schema:
          Joi.object({})
  }
]
