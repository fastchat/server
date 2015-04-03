'use strict'
#
# FastChat
# 2015
#

gcm = require 'node-gcm'

class GCM

  constructor: ->
    @key = process.env.GCM_API_KEY
    @setup(@key) if @key

  setup: (key)->
    @Sender = new gcm.Sender(key)

  send: (opts = {})->
    return BadRequest('Token is required!') unless opts.token

    message = new gcm.Message(data: opts)
    Sender.send(message, [opts.token], 4)

module.exports = new GCM()
