'use strict'
#
# FastChat
# 2015
#

should = require('chai').should()
APN = require '../../lib/model/apn'
sinon = require 'sinon'

describe 'APN', ->

  it 'should exist', ->
    should.exist APN
    APN.should.be.an.object

  it 'should have no opts by default', ->
    APN.opts.production.should.be.no
    should.not.exist APN.opts.certData
    should.not.exist APN.opts.keyData

  it 'should setup the APN', ->
    should.not.exist APN.connection
    APN.setup()
    should.exist APN.connection

  it 'should throw without a token', ->
    stub = sinon.stub(APN.connection, 'pushNotification')
    err = APN.send()
    err.message.should.equal 'Token is required!'
    stub.calledOnce.should.be.false
    stub.restore()

  it 'should send a push notification', ->
    stub = sinon.stub(APN.connection, 'pushNotification')
    APN.send({
      token: 'tokentoken'
      message: 'Some text'
      badge: 1
      group: '00000000000000000'
    })
    stub.calledOnce.should.be.true
    stub.args[0][0].alert.should.equal 'Some text'
    stub.args[0][0].badge.should.equal 1
    stub.restore()

  it 'should set content available', ->
    stub = sinon.stub(APN.connection, 'pushNotification')
    APN.send({
      token: 'tokentoken'
      message: 'Some text'
      contentAvailable: yes
    })
    stub.calledOnce.should.be.true
    stub.args[0][0].contentAvailable.should.be.true
    stub.args[0][0].badge.should.equal 0
    stub.restore()

  it 'should throw without a token', ->
    stub = sinon.stub(APN.connection, 'pushNotification')
    err = APN.send({
      token: null
      message: 'Some text'
    })
    err.message.should.equal 'Token is required!'
    stub.calledOnce.should.be.false
    stub.restore()

  after ->
    APN.connection = undefined
