'use strict'
#
# FastChat
# 2015
#

Q = require 'q'
log = require './log'
User = require '../model/user'

find = (token, cb)->
  log.debug 'AUTH Got called'
  User.findWithToken(token).then (user)->
    cb(null, true, user: user, token: token)
  .fail (err)->
    cb(null, false)
  .done()

module.exports = (server)->
  deferred = Q.defer()
  log.debug 'auth 1'
  server.register require('hapi-auth-bearer-token'), (err)->
    return deferred.reject(err) if err
    log.debug 'auth 2'
    server.auth.strategy(
      'token',
      'bearer-access-token',
      validateFunc: (token, cb)->
        log.debug 'AUTH CALLED', token
        User.findWithToken(token).then (user)->
          cb(null, true, user: user, token: token)
        .fail (err)->
          cb(null, false)
        .done()
    )
    deferred.resolve()

    log.debug 'auth 3'
  deferred.promise
