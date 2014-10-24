require('blanket')
should = require('chai').should()
Message = require('../../index').Message

describe 'Messages', ->

  it 'should exist', ->
    should.exist(Message)
