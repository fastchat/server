'use strict'
#
# FastChat
# 2015
#

Device = require('../model/device')

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
    reply(if device then device else {}).code(if device then 201 else 200)
  .fail(reply)
  .done()

module.exports = [
  {
    method: 'GET'
    path: '/user/device'
    handler: getDevices
  }
  {
    method: 'POST'
    path: '/user/device'
    handler: postDevice
  }
]
