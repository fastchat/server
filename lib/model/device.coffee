'use strict'
#
# FastChat
# 2015
#

mongoose = require('mongoose-q')()
Schema = mongoose.Schema
Boom = require 'boom'
Q = require 'q'
APN = require './apn'
GCM = require './gcm'

###
 * Holds the information about a device. This is used to be able to run smart
 * notifications. We can send notifications to the "last active device" and
 * then wait to send to the rest.
 *
 * type Should be either 'ios' or 'android'. Used to send notifications to the
 * correct gateways. More can be added later.
###
DeviceSchema = new Schema
  user: {type: Schema.Types.ObjectId, ref: 'User'}
  accessToken: {type: String, default: ''}
  loggedIn: {type: Boolean, default: true}
  active: {type: Boolean, default: true}
  token: String
  type: String
  lastActiveDate: Date
  failedAttempts: Number

###
 * Sends a string to the device.
 * Sets some nice defaults, and takes care of sending to APN or GCM.
 *
 * @message A string to send to the user in a notification.
###
DeviceSchema.methods =

  send: (group, message, badge, contentAvailable)->
    return if not @active or not @loggedIn

    if @type is 'android'
      @sendAndroid group, message, badge
    else if @type is 'ios'
      @sendIOS group, message, badge, contentAvailable

  sendAndroid: (group, message, badge, contentAvailable)->
    GCM.send({
      group: group._id if group
      text: message if message
      alert: badge if badge
      token: @token
    })

  sendIOS: (group, message, badge, contentAvailable)->
    APN.send({
      token: @token
      badge: if badge then badge else 0
      message: message
      group: group?._id
      contentAvailable: contentAvailable
    })

  objectify: ->
    {
      _id: @_id.toString()
      user: @user.toString()
      accessToken: @accessToken
      loggedIn: @loggedIn
      active: @active
      token: @token
      type: @type
    }

  logout: ->
    @loggedIn = no
    @saveQ()

DeviceSchema.statics =

  createOrUpdate: (user, token, type, sessionToken)->
    throw Boom.badRequest 'You must specify a token to register a device!' unless token
    if not type or (type isnt 'ios' and type isnt 'android')
      throw Boom.badRequest 'Type must be "ios" or "android"!'

    @findOneQ(token: token, user: user._id)
    .then (device)=>
      return @updateDevice device, sessionToken if device
      @createDevice(user, token, type, sessionToken)
      .then (device)->
        user.devices.push device
        user.saveQ().then -> device

  createDevice: (user, token, type, sessionToken)->
    device = new this({
      token: token
      type: type
      user: user._id
      accessToken: sessionToken
    })
    device.saveQ().then -> device

  updateDevice: (device, sessionToken)->
    device.accessToken = sessionToken
    device.active = yes
    device.loggedIn = yes
    device.saveQ().then -> Q()

module.exports = mongoose.model 'Device', DeviceSchema
