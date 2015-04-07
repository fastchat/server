'use strict'
#
# FastChat
# 2015
#

should = require('chai').should()
Message = require '../../lib/model/message'

describe 'Messages', ->

  it 'should exist', ->
    should.exist Message
