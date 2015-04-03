'use strict'
#
# FastChat
# 2015
#

Device = require('../model/device')
Joi = require 'joi'

getDevices = (req, reply)->
  {user} = req.auth.credentials
  Device.findQ(user: user._id)
  .then (devices)->
    reply(devices)
  .fail(reply)
  .done()

postDevice = (req, reply)->
  {user, token} = req.auth.credentials
  Device.createOrUpdate(user, req.payload.token, req.payload.type, token)
  .then (device)->
    reply(device.objectify()).code(if device then 201 else 200)
  .fail(reply)
  .done()

module.exports = [
  {
    method: 'GET'
    path: '/user/device'
    config:
      handler: getDevices
      description: 'Gets all registered devices for the current user.'
      notes: "Gets all devices for the current user.

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
            '$headers.Authorization', {
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
              _id: Joi.string().required().description("The id for the device")
              user: Joi.string().required().description("The user ID for this device")
              accessToken: Joi.string().required("The Access Token used to create this device.
              When the this access token is logged out, we will stop sending push notifications
              to the device.")
              loggedIn: Joi.boolean().required()
              active: Joi.boolean().required()
              token: Joi.string().required()
              type: Joi.string().required().valid('ios', 'android')
              lastActiveDate:  Joi.date()
              failedAttempts: Joi.number()
            }).meta({
              className: 'Device'
            })
          )
  }
  {
    method: 'POST'
    path: '/user/device'
    config:
      handler: postDevice
      description: 'Gives the user a new Device to send push notifications to.'
      notes: "Creates a new device on the server with the token. This token will
      differ between iOS and Android, but will be used to send push notifications
      to the device. You also must specify which device type it is.

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
              is: Joi.exist()
              otherwise: Joi.forbidden()
            })
        headers: Joi.object({
          authorization: Joi.string().trim().regex(/^Bearer\s[a-zA-Z0-9]+$/).when(
            '$query.access_token', {
              is: Joi.forbidden()
              otherwise: Joi.exist()
            }
          )
        }).unknown()
        payload:
          token: Joi.string().required()
          type: Joi.string().required().valid('ios', 'android')
      response:
        schema:
          Joi.object({
            _id: Joi.string().required().description("The id for the device")
            user: Joi.string().required().description("The user ID for this device")
            accessToken: Joi.string().required("The Access Token used to create this device.
            When the this access token is logged out, we will stop sending push notifications
            to the device.")
            loggedIn: Joi.boolean().required()
            active: Joi.boolean().required()
            token: Joi.string().required()
            type: Joi.string().required().valid('ios', 'android')
          }).meta({
            className: 'Device'
          })
  }
]
