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

    @server.ext 'onPreResponse', (req, reply)->
      response = req.response
      console.log 'Got middleware!', err
      if err is 404
        res.status(404).json error: 'Not Found'
      else if err is 500
        res.status(500).json error: 'Internal Server Error'
      else if err is 401
        res.status(401).json error : 'Unauthorized'
      else if (typeof err is 'string' or err instanceof String)
        res.status(400).json error: err
      else if err.isBoom
        message = err.output.payload.message or err.output.payload.error
        console.log('BOOM ERROR', err.output.payload.statusCode, message)
        res.status(err.output.payload.statusCode).json error: message
      else
        next err

  setup: ->
    register = Q.nbind(@server.register, @server)
    register({
      register: require('hapi-router-coffee')
      options:
        routesDir: "#{__dirname}/routes/"
    }).then =>
      Authentication(@server)
    .then =>
      @server.route
        method: '*'
        path: '/{p*}'
        handler: (req, reply)->
          reply(NotFound())

  start: ->
    Q.nbind(@server.start, @server)()

module.exports = Server
