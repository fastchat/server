#
# FastChat
# 2015
#

Q = require 'q'
mongoose = require('mongoose-q')()
log = require '../helpers/log'

module.exports = (config)->
  deferred = Q.defer()
  mongoUri = process.env.MONGOLAB_URI or 'mongodb://localhost/dev'
  log.debug 'Connecting to DB: ', mongoUri
  mongoose.connect(mongoUri)
  db = mongoose.connection

  db.on 'error', (err)->
    deferred.reject(err)

  db.once 'open', ->
    deferred.resolve(db)

  deferred.promise
