'use strict'

winston = require 'winston'
level = process.env.WINSTON or 'debug'

log = new (winston.Logger)({
  transports: [
    new winston.transports.Console
      level: level
      colorize: yes
      json: no
      timestamp: yes
      prettyPrint: yes
      label: process.pid
  ]
})

module.exports = log
