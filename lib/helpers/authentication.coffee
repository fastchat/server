#
# FastChat
# 2015
#

log = require './log'
User = require '../model/user'

find = (token, cb)->
  User.findWithToken(token).then (user)->
    cb(null, true, user: user)
  .fail (err)->
    cb(null, false)
  .done()

module.exports = (server)->
  register = Q.nbind(server.register, server)
  register require('hapi-auth-bearer-token'), (err)->
    server.auth.strategy(
      'token',
      'bearer-access-token',
      validateFunc: find
    )
