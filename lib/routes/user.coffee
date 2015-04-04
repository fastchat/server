'use strict'
#
# FastChat
# 2015
#

User = require '../model/user'
ObjectId = require('mongoose-q')().Types.ObjectId
multiparty = require 'multiparty'
Boom = require 'boom'
Joi = require 'joi'

# POST /login
# This is an alternative implementation that uses a custom callback to
# acheive the same functionality.
login = (req, reply)->
  {username, password} = req.payload

  User.findByLowercaseUsername(username).then (user)->
    [user, user.comparePassword(password)]
  .spread (user, matched)->
    token = user.generateRandomToken()
    user.accessToken.push token
    [token, user.saveQ()]
  .spread (token)->
    reply(access_token: token)
  .fail(reply)
  .done()

# POST /user
register = (req, reply)->
  User.register(req.payload?.username, req.payload?.password)
  .then (user)->
    reply(user).code(201)
  .fail(reply)
  .done()


# GET /user
profile = (req, reply)->
  {user} = req.auth.credentials
  User.findOne(_id: user.id)
  .populate('groups', 'name')
  .populate('leftGroups', 'name')
  .populate('groupSettings')
  .execQ()
  .then (user)->
    console.log 'profile', user
    reply(user)
  .fail(reply)
  .done()


logout = (req, reply)->
  {user, token} = req.auth.credentials
  user.logout(token, req.query.all)
  .then ->
    reply({})
  .fail(reply)
  .done()


uploadAvatar = (req, reply)->
  {user} = req.auth.credentials
  user.uploadAvatar(req.payload.avatar).then ->
    reply({})
  .fail(reply)
  .done()


getAvatar = (req, reply)->
  idParam = req.params.id
  userId = new ObjectId(idParam)

  User.findOneQ(_id: userId)
  .then (user)->
    throw Boom.notFound() unless user
    user.getAvatar()
  .spread (meta, data)->
    reply(data).type(meta)
  .fail(reply)
  .done()


module.exports = [
  {
    method: 'POST'
    path: '/login'
    config:
      handler: login
      auth: false
      description: 'Logs a user in.'
      notes: 'Given a username and unhashed password, logs in the user.'
      tags: ['api']
      plugins:
        'hapi-swagger':
          responseMessages: [
            {
              code: 400
              message: 'Bad Request. Occurs when you fail to give the required data.'
            }
          ]
      validate:
        payload:
          username: (
            Joi.string()
            .min(4).max(100).lowercase().trim().regex(/^[a-zA-Z0-9-_.]+$/).required()
            )
          password: (
            Joi.string().min(1).max(100).required()
          )
      response:
        schema:
          Joi.object({
            access_token: Joi.string().required().description("The Access Token used for
            authentication. The client should store this and keep it safe and secret").example('token')
          })
  }
  {
    method: 'POST'
    path: '/user'
    config:
      handler: register
      auth: false
      description: 'Registers a user'
      notes: "The starting place for users. This endpoint registers a new user and
sets the default  values on the profile. This endpoint does *not* log them in, so you
will have to hit /login"
      tags: ['api']
      plugins:
        'hapi-swagger':
          responseMessages: [
            {
              code: 400
              message: 'Bad Request. Occurs when you fail to give the required data.'
            }
            {
              code: 409
              message: 'Conflict. The username is already taken.'
            }
          ]
      validate:
        payload:
          username: (
            Joi.string()
            .min(4).max(100).lowercase().trim().regex(/^[a-zA-Z0-9-_.]+$/).required()
            )
          password: (
            Joi.string().min(1).max(100).required()
          )
      response:
        schema:
          Joi.object({
            username: Joi.string().required().description('The username signed up with')
            password: Joi.string().required().description("The user's hashed password")
            _id: Joi.required().description("The unique id for the user")
            avatar: Joi.optional()
            groupSettings: Joi.array().length(0).required()
            devices: Joi.array().length(0).required()
            leftGroups: Joi.array().items(Joi.string()).length(0).required()
            groups: Joi.array().length(0).required()
            accessToken: Joi.array().length(0).required()
          }).meta({
            className: 'User'
          }).unknown()
  }
  {
    method: 'GET'
    path: '/user'
    config:
      handler: profile
      description: 'Gets the user profile.'
      notes: "Gets the currently logged in user's profile.

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
          Joi.object({
            username: Joi.string().required().description('The username signed up with')
            password: Joi.string().required().description("The user's hashed password")
            _id: Joi.required().description("The unique id for the user")
            avatar: Joi.optional()
            groupSettings: Joi.array().required()
            devices: Joi.array().required()
            leftGroups: Joi.array().items(Joi.string()).required()
            groups: Joi.array().required()
            accessToken: Joi.array().required()
          }).meta({
            className: 'User'
          }).unknown()
  }
  {
    method: 'DELETE'
    path: '/logout'
    config:
      handler: logout
      description: 'Logs the user out'
      notes: "Logs the user out. Optionally logs the user out of all devices, by clearing
      out all session tokens.

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
          all: Joi.boolean()
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
    method: 'POST'
    path: '/user/{id}/avatar'
    config:
      payload:
        output: 'file'
      handler: uploadAvatar
      description: 'Uploads an avatar for the user.'
      notes: "The avatar must be an image, and it will be shown in a smaller scale,
      so uploading large images will not help. The images will be cropped into a circle
      on some platforms. This work is done client side.

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
          avatar: Joi.binary().required().meta(swaggerType: 'file')
      response:
        schema:
          Joi.object({})
  }
  {
    method: 'GET'
    path: '/user/{id}/avatar'
    config:
      handler: getAvatar
      description: 'Gets the Avatar for the user'
      notes: "For protection, the avatar is stored on AWS, but must be accessed through
      the server with the key and secret. This means that the information is not public.
      This route returns the binary data for the image.

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
              message: "Not Found. Thrown when you try and access a user's avatar when
              you are not in any groups with that user."
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
      response:
        schema:
          Joi.binary().required()
  }
]
