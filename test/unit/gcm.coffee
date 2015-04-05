'use strict'
#
# FastChat
# 2015
#

should = require('chai').should()
GCM = require '../../lib/model/gcm'
sinon = require 'sinon'

describe 'GCM', ->

  it 'should exist', ->
    should.exist GCM
    GCM.should.be.an.object
    should.not.exist GCM.Sender

  it 'should create the sender', ->
    GCM.setup('key')
    should.exist GCM.Sender

  it 'sbould throw without any parameters', ->
    stub = sinon.stub(GCM.Sender, 'send')
    err = GCM.send()
    err.message.should.equal 'Token is required!'
    stub.calledOnce.should.be.false
    stub.restore()

  it 'should send', ->
    stub = sinon.stub(GCM.Sender, 'send')
    GCM.send({
      token: 'token'
      text: 'text'
      alert: 1
    })
    stub.calledOnce.should.be.true
    stub.args[0][0].data.text.should.equal 'text'
    stub.args[0][0].data.token.should.equal 'token'
    stub.args[0][0].data.alert.should.equal 1
    stub.restore()

  after ->
    GCM.Sender = undefined
