'use strict'
#
# FastChat
# 2015
#

should = require('chai').should()
mongoose = require('mongoose-q')()
User = require('../../lib/model/user')
Server = require '../../lib/server'

describe 'Devices', ->

  user = null
  s = null

  before (done)->
    mongoose.connect process.env.MONGOLAB_URI

    s = new Server(port: process.env.PORT or 3000)
    s.setup().then ->
      s.start()
    .then ->
      User.removeQ()
    .then ->
      User.register('test1', 'test')
    .then (user)->
      token = user.generateRandomToken()
      user.accessToken.push token
      [user, user.saveQ()]
    .spread (u)->
      user = u
      done()
    .done()

  it 'should be empty when you first request a token', (done)->
    req =
      url: '/user/device'
      headers:
        Authorization: "Bearer #{user.accessToken[0]}"

    s.server.inject req, (res)->
      res.statusCode.should.equal 200
      res.headers['content-type'].should.match /json/
      res.result.should.be.empty
      done()


  it 'should return an error if you send nothing in the post request', (done)->
    req =
      method: 'POST'
      url: '/user/device'
      payload: JSON.stringify({})
      headers:
        Authorization: "Bearer #{user.accessToken[0]}"

    s.server.inject req, (res)->
      res.statusCode.should.equal 400
      res.headers['content-type'].should.match /json/
      should.exist res.result.error
      done()

  it 'should return an error if you send not ios or android', (done)->
    req =
      method: 'POST'
      url: '/user/device'
      payload: JSON.stringify({
        token: 'something'
        type: 'windows_phone'
      })
      headers:
        Authorization: "Bearer #{user.accessToken[0]}"

    s.server.inject req, (res)->
      res.statusCode.should.equal 400
      res.headers['content-type'].should.match /json/
      should.exist res.result.error
      done()

  it 'should let you create an iOS device', (done)->
    req =
      method: 'POST'
      url: '/user/device'
      payload: JSON.stringify({
        token: 'somethingcool'
        type: 'ios'
      })
      headers:
        Authorization: "Bearer #{user.accessToken[0]}"

    s.server.inject req, (res)->
      console.log 'res', res.result
      res.statusCode.should.equal 201
      res.headers['content-type'].should.match /json/
      should.exist res.result
      done()

  it 'should let you create an Android device', (done)->
    req =
      method: 'POST'
      url: '/user/device'
      payload: JSON.stringify({
        token: 'awesometoken'
        type: 'android'
      })
      headers:
        Authorization: "Bearer #{user.accessToken[0]}"

    s.server.inject req, (res)->
      console.log 'res', res.result
      res.statusCode.should.equal 201
      res.headers['content-type'].should.match /json/
      should.exist res.result
      done()


  it 'should update your device if you sent in the same token', (done)->
    req =
      method: 'POST'
      url: '/user/device'
      payload: JSON.stringify({
        token: 'somethingcool'
        type: 'ios'
      })
      headers:
        Authorization: "Bearer #{user.accessToken[0]}"

    s.server.inject req, (res)->
      res.statusCode.should.equal 200
      res.headers['content-type'].should.match /json/
      should.exist res.result
      done()

  it 'should show all your devices when you request them', (done)->
    req =
      url: '/user/device'
      headers:
        Authorization: "Bearer #{user.accessToken[0]}"

    s.server.inject req, (res)->
      res.statusCode.should.equal 200
      res.headers['content-type'].should.match /json/
      res.result.should.have.length 2
      done()

  after (done)->
    mongoose.disconnect()
    s.stop().then ->
      done()
