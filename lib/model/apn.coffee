'use strict'
#
# FastChat
# 2015
#

BadRequest = require('boom').badRequest
apn = require 'apn'
IOS_DEFAULT_SOUND = 'ping.aiff'

###
* class APN
*
* This class handles the APN connection, which is optional. If no certs are found
* in the environment, or passed in, then sending push notifications will do
* nothing but log a message.
###
class APN

  constructor: ->
    @opts =
      certData: process.env.FASTCHAT_PUSH_CERT
      keyData: process.env.FASTCHAT_PUSH_KEY
      production: if process.env.ENV is 'dev' then false else true

    @setup(@opts) if @opts.certData and @opts.keyData

  setup: (opts)->
    @connection = new apn.Connection(opts)

  send: (opts = {})->
    return BadRequest('Token is required!') unless opts.token

    opts.badge ?= 0

    try
      device = new apn.Device opts.token
    catch err
      return BadRequest('Bad iOS Token!')

    note = new apn.Notification()
    note.expiry = Math.floor(Date.now() / 1000) + 3600 #Expires 1 hour from now.
    note.badge = opts.badge if opts.badge or opts.badge is 0
    note.alert = opts.message if opts.message
    note.payload = group: opts.group._id if opts.group

    if opts.contentAvailable
      note.setContentAvailable(yes)
    else
      note.sound = IOS_DEFAULT_SOUND


    @connection.pushNotification note, device if @connection


module.exports = new APN()
