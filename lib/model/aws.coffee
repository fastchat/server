'use strict'
#
# FastChat
# 2015
#

EventEmitter = require('events').EventEmitter
NotImplemented = require('boom').notImplemented
Knox = require 'knox'
Message = 'AWS_KEY or AWS_SECRET was not available! S3 access is disabled!'

class AWS extends EventEmitter

  constructor: (bucket, key = process.env.AWS_KEY, secret = process.env.AWS_SECRET)->
    super()
    return this unless key and secret
    @knox = Knox.createClient
      key: key
      secret: secret
      bucket: bucket

  upload: (stream, name, options, cb)->
    return cb NotImplemented(Message) unless @knox
    @knox.putStream(stream, name, options, cb)

  get: (name)->
    return @emit 'error', NotImplemented(Message) unless @knox
    @knox.get(name)


module.exports = AWS
