'use strict';
#
# FastChat
# 2015
#

argv = require('yargs')
  .usage('Usage: $0 [-p PORT]')
  .default('p', 6190)
  .argv
Server = require '../lib/server'
Mongo = require '../lib/model/mongo'
log = require '../lib/helpers/log'

s = new Server(port: argv.p)
s.setup().then ->
  Mongo()
.then ->
  s.start()
.fail (err)->
  log.error '************* ERROR STARTING SERVER *************'
  log.error err
  log.error '************* ERROR STARTING SERVER *************'
  log.error 'What most likely happened?'
  log.error 'The Server FAILED to get the correct configuration values for Startup!'
  log.error '    Are the Config values correct?'
  log.error '    Are the Config values valid JSON?'
  log.error '    Did you use the Makefile? This is what it\'s there for.'
  log.error '    Did you start the process with the correct ENV Variables?'
  process.exit(1)
.done()
