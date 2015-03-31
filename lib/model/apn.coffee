'use strict'
#
# FastChat
# 2015
#

apn = require 'apn'
IOS_DEFAULT_SOUND = "ping.aiff"

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

    @setup(@opts) if opts.certData and opts.keyData

  setup: (opts)->
    @connection = new apn.Connection(opts)

  send: (opts)->
    try
      device = new apn.Device opts.token
    catch err



module.exports = new APN()


