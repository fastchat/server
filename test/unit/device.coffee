should = require('chai').should()
Device = require '../../lib/model/device'
User = require '../../lib/model/user'
sinon = require 'sinon'
mongoose = require 'mongoose'
Q = require 'Q'

describe 'Device', ->

  before (done)->
    mongoose.connect 'mongodb://localhost/test'
    db = mongoose.connection
    db.once 'open', ->
      Device.remove {}, (err)->
        done()

  describe 'Sending', ->
    device = null
    beforeEach ->
      device = new Device

    it 'should not send if inactive', ->
      device.active = no

      android = sinon.spy(device, "sendAndroid")
      ios = sinon.spy(device, "sendIOS")
      device.send()
      android.calledOnce.should.be.false
      ios.calledOnce.should.be.false

    it 'Should not send if logged out', ->
      device.loggedIn = no

      android = sinon.spy(device, "sendAndroid")
      ios = sinon.spy(device, "sendIOS")
      device.send()
      android.calledOnce.should.be.false
      ios.calledOnce.should.be.false

    it 'should not send a message if you are both', ->
      device.loggedIn = no
      device.active = no

      android = sinon.spy(device, "sendAndroid")
      ios = sinon.spy(device, "sendIOS")
      device.send()
      android.calledOnce.should.be.false
      ios.calledOnce.should.be.false

    it 'should send an android message', ->
      device.type = 'android'

      android = sinon.spy(device, "sendAndroid")
      ios = sinon.spy(device, "sendIOS")
      device.send('213', 'Message', 5)
      android.calledOnce.should.be.ok
      ios.calledOnce.should.be.false

    it 'should send an ios message', ->
      device.type = 'ios'
      device.token = 'ba60aa0fa63e3ad5d3b0a35e389d391f48f945f1be8a8731da2b48979c80dcfa'

      android = sinon.spy(device, "sendAndroid")
      ios = sinon.spy(device, "sendIOS")
      device.send('3424', 'text', 1)
      android.calledOnce.should.be.false
      ios.calledOnce.should.be.ok

    it 'should set iOS badge to 0 if not given a badge', ->
      device.type = 'ios'
      device.token = 'ba60aa0fa63e3ad5d3b0a35e389d391f48f945f1be8a8731da2b48979c80dcfa'
      device.sendIOS '3424', 'text'

    it 'should set contentAvailable', ->
      device.type = 'ios'
      device.token = 'ba60aa0fa63e3ad5d3b0a35e389d391f48f945f1be8a8731da2b48979c80dcfa'
      device.sendIOS '3424', 'text', 0, yes

    it 'should throw an error with a bad token for ios', ->
      device.type = 'ios'
      device.token = 'GGGGG'
      device.sendIOS '3424', 'text'

  describe 'Logout', ->
    it 'should log out', ->
      device = new Device
      device.loggedIn.should.be.true
      device.active.should.be.true
      promise = device.logout()
      device.loggedIn.should.be.false
      Q.isPromise(promise).should.be.true

  describe 'Creating and Updating', ->

    it 'should throw an error without a token', (done)->
      try
        Device.createOrUpdate()
      catch err
        err.message.should.contain 'token'
        done()

    it 'should throw an error without a type', (done)->
      try
        Device.createOrUpdate {}, 'token'
      catch err
        err.message.should.contain 'Type'
        done()

    it 'should throw an error with windows phone', (done)->
      try
        Device.createOrUpdate {}, 'token', 'windows-phone'
      catch err
        err.message.should.contain 'Type'
        done()

    it 'should create a new device when not found', (done)->
      user = new User()
      sinon.stub(user, 'saveQ').returns( Q() )
      create = sinon.spy(Device, 'createDevice')

      sinon.stub(Device, 'findOneQ').returns( Q(null) )
      Device.createOrUpdate(user, 'token', 'android', 'sessiontoken').then ->
        create.called.should.be.true
        Device.findOneQ.restore()
        done()

    it 'should find the device and update it', (done)->
      user = new User()
      device = new Device
        active: no
        loggedIn: no
        accessToken: 'old'

      update = sinon.spy(Device, 'updateDevice')
      sinon.stub(Device, 'findOneQ').returns( Q(device) )
      Device.createOrUpdate(user, 'token', 'android', 'sessiontoken').then ->
        update.called.should.be.true
        Device.findOneQ.restore()
        done()

  after (done)->
    mongoose.disconnect()
    done()
