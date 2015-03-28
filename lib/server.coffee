'use strict'
#
# FastChat
# 2015
#

Hapi = require 'hapi'
NotFound = require('boom').notFound
Q = require 'q'
log = require './helpers/log'
Boom = require 'boom'
Authentication = require './helpers/authentication'
MongoIDError = 'Uncaught error: Argument passed in must be a single String of 12 bytes or a string of 24 hex characters'

class Server

  constructor: (opts)->
    @server = new Hapi.Server({
      connections:
        routes:
          payload:
            timeout: no
          cors:
            origin: ['*']
          timeout:
            server: no
            socket: no
    })
    @server.connection(opts)
    @io = require('./socket/socket').setup(@server)

    @server.ext 'onPreResponse', (req, reply)->
      res = req.response
      return reply(Boom.notFound()) if res.isBoom and res.message is MongoIDError
      reply.continue()


  setup: ->
    log.debug 'go time'
    register = Q.nbind(@server.register, @server)
    Authentication(@server).then =>
      @server.auth.default('token')
      register({
        register: require('hapi-router-coffee')
        options:
          routesDir: "#{__dirname}/routes/"
      })
    .then =>
      @server.route
        method: '*'
        path: '/{p*}'
        config:
          auth: null
          handler: (req, reply)->
            reply(NotFound())
    .fail (err)->
      log.error 'FAILURE', err

  start: ->
    Q.nbind(@server.start, @server)().then =>
      log.warn 'Server started at: ', @server.info.uri

module.exports = Server
