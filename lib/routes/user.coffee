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
    reply(profile: user)
  .fail(reply)
  .done()


logout = (req, reply)->
  {user, token} = req.auth.credentials
  user.logout(token, req.query.all is 'true')
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
      validate:
        payload:
          username: (
            Joi.string()
            .min(4).max(100).lowercase().trim().regex(/^[a-zA-Z0-9-_.]+$/).required()
            )
          password: (
            Joi.string().min(1).max(100).required()
          )
  }
  {
    method: 'GET'
    path: '/user'
    handler: profile
  }
  {
    method: 'DELETE'
    path: '/logout'
    handler: logout
  }
  {
    method: 'POST'
    path: '/user/{id}/avatar'
    config:
      handler: uploadAvatar
      payload:
        output: 'file'
  }
  {
    method: 'GET'
    path: '/user/{id}/avatar'
    handler: getAvatar
  }
]
