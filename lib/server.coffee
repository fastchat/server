'use strict'
#
# FastChat
# 2015
#

Hapi = require 'hapi'
Web = require 'fastchat-web'
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

    @server.on 'request-error', (req, err)->
      log.warn 'INTERNAL SERVER ERROR', err
      log.warn 'INTERNAL SERVER ERROR', req.path


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
    .then ->
      swaggerOptions =
        apiVersion: 'v1'
        info:
          title: 'FastChat Documentation'
          description: "FastChat is a fast, efficient, and simple chat application built
          on Node and written in CoffeeScript. It uses Socket.io has the realtime communication
          mechanism. FastChat supports two person conversations, group chats, images, and
          push notifications. This is the API Documentation, if you are interested in
          developing on the Server, you should checkout the GitHub repo."

      register({
        register: require('hapi-swagger')
        options: swaggerOptions
      })
    .then =>
      @server.route
        method: 'GET'
        path: '/{param*}'
        config:
          auth: false
          handler:
            directory:
              path: Web()
              index: yes

      @server.route
        method: ['DELETE', 'POST', 'PUT']
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

  stop: (opts)->
    Q.nbind(@server.stop, @server)(opts)


module.exports = Server
