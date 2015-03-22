'use strict'
#
# FastChat
# 2015
#

Hapi = require 'hapi'
NotFound = require('boom').notFound
Q = require 'q'
log = require './helpers/log'
SocketIO = require 'socket.io'
Authentication = require './helpers/authentication'

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
    @io = SocketIO.listen(@server.listener)


  setup: ->
    log.debug 'go time'
    register = Q.nbind(@server.register, @server)
    log.debug '0'
    Authentication(@server).then =>
      log.debug '1'
      @server.auth.default('token')
      log.debug '2'
      register({
        register: require('hapi-router-coffee')
        options:
          routesDir: "#{__dirname}/routes/"
      })
    .then =>
      log.debug '3'
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
    Q.nbind(@server.start, @server)()

module.exports = Server
