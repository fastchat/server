'use strict'
#
# FastChat
# 2015
#


fs = require 'fs'
should = require('chai').should()
mongoose = require('mongoose-q')()
User = require('../../lib/model/user')
Server = require '../../lib/server'
Q = require 'q'
token = null
createdUser = null
UNAUTHENTICATED_MESSAGE = 'Unauthorized'
requestQ = null

describe 'Users', ->

  s = null
  before (done)->
    mongoose.connect process.env.MONGOLAB_URI
    s = new Server(port: process.env.PORT or 3000)

    requestQ = (req)->
      deferred = Q.defer()
      s.server.inject req, (res)->
        deferred.resolve(res)
      deferred.promise

    s.setup().then ->
      s.start()
    .then ->
      User.removeQ()
    .then ->
      done()
    .done()

  it 'should fail to register a new user without the proper information', (done)->
    req =
      method: 'POST'
      url: '/user'
      payload: JSON.stringify({})

    s.server.inject req, (res)->
      res.statusCode.should.equal 400
      res.headers['content-type'].should.match /json/
      should.exist res.result.error
      done()

  it 'should allow a user to be registered with a username and password', (done)->
    requestQ({
      method: 'POST'
      url: '/user'
      payload: JSON.stringify({
        username: 'test1'
        password: 'test'
      })
    }).then (res)->
      res.statusCode.should.equal 201
      res.headers['content-type'].should.match /json/
      should.not.exist res.result.error
      should.exist res.result.username
      res.result.username.should.equal('test1')
      res.result.password.should.not.equal('test')
      createdUser = res.result
      User.findQ()
    .then (users)->
      users.should.have.length(1)
      done()
    .done()

  it 'should not allow you to login without a username and password', (done)->
    req =
      method: 'POST'
      url: '/login'
      payload: JSON.stringify({})

    s.server.inject req, (res)->
      res.statusCode.should.equal 400
      res.result.error.should.equal 'Bad Request'
      res.headers['content-type'].should.match /json/
      should.exist res.result.error
      done()

  it 'should allow you to login with a username and password', (done)->
    req =
      method: 'POST'
      url: '/login'
      payload: JSON.stringify({
        username: 'test1'
        password: 'test'
      })

    s.server.inject req, (res)->
      res.statusCode.should.equal 200
      res.headers['content-type'].should.match /json/
      should.not.exist res.result.error
      should.exist res.result.access_token
      token = res.result.access_token
      done()

  it 'should return a new Access Token if you login again', (done)->
    req =
      method: 'POST'
      url: '/login'
      payload: JSON.stringify({
        username: 'test1'
        password: 'test'
      })

    s.server.inject req, (res)->
      res.statusCode.should.equal 200
      res.headers['content-type'].should.match /json/
      should.not.exist res.result.error
      token.should.not.equal res.result.access_token
      done()

  it 'should return the user profile', (done)->
    req =
      url: '/user'
      headers:
        Authorization: "Bearer #{token}"

    s.server.inject req, (res)->
      res.statusCode.should.equal 200
      res.headers['content-type'].should.match /json/
      should.exist res.result
      createdUser.username.should.equal res.result.username
      createdUser.password.should.equal res.result.password
      createdUser._id.toString().should.equal res.result._id.toString()
      res.result.groups.should.have.length 0
      res.result.leftGroups.should.have.length 0
      done()

  it 'should not allow you to logout without an access token', (done)->
    req =
      method: 'DELETE'
      url: '/logout'

    s.server.inject req, (res)->
      res.statusCode.should.equal 401
      res.headers['content-type'].should.match /json/
      res.result.error.should.contain UNAUTHENTICATED_MESSAGE
      done()

  it 'should log you out and remove your access token', (done)->
    arrayLength = -1

    User.findOneQ(_id: createdUser._id).then (user)->
      arrayLength = user.accessToken.length

      requestQ({
        method: 'DELETE'
        url: '/logout'
        headers:
          Authorization: "Bearer #{token}"
      })
    .then (res)->
      res.statusCode.should.equal 200
      res.headers['content-type'].should.match /json/
      # did we delete it?
      User.findOneQ(_id: createdUser._id)
    .then (user)->
      newLength = user.accessToken.length
      newLength.should.below(arrayLength)
      (newLength + 1).should.equal(arrayLength)
      done()
    .done()

  it 'should not let you login with your old access token', (done)->
    req =
      method: 'DELETE'
      url: '/logout'

    s.server.inject req, (res)->
      res.statusCode.should.equal 401
      res.headers['content-type'].should.match /json/
      res.result.error.should.contain UNAUTHENTICATED_MESSAGE
      done()

  it 'should give a 401 on profile request', (done)->
    req =
      url: '/user'
      headers:
        Authorization: "Bearer #{token}"

    s.server.inject req, (res)->
      res.statusCode.should.equal 401
      res.headers['content-type'].should.match /json/
      done()

  it 'should return a new Access Token if you login again', (done)->
    req =
      method: 'POST'
      url: '/login'
      payload: JSON.stringify({
        username: 'test1'
        password: 'test'
      })

    s.server.inject req, (res)->
      res.statusCode.should.equal 200
      res.headers['content-type'].should.match /json/
      token = res.result.access_token
      done()

  it 'logging out of ALL should remove all access tokens', (done)->
    arrayLength = -1

    User.findOneQ(_id: createdUser._id).then (user)->
      arrayLength = user.accessToken.length
      arrayLength.should.equal(2)

      requestQ({
        method: 'DELETE'
        url: '/logout?all=true'
        headers:
          Authorization: "Bearer #{token}"
      })
    .then (res)->
      res.statusCode.should.equal 200
      res.headers['content-type'].should.match /json/
      should.not.exist res.result.error
      # did we delete it?
      User.findOneQ(_id: createdUser._id)
    .then (user)->
      user.accessToken.should.be.empty
      done()
    .done()


  it.skip 'should let a user upload an avatar', (done)->
    requestQ({
      method: 'POST'
      url: '/login'
      payload: JSON.stringify({
        username: 'test1'
        password: 'test'
      })
    }).then (res)->
      res.statusCode.should.equal 200
      res.headers['content-type'].should.match /json/
      should.exist res.result.access_token
      token = res.result.access_token

      requestQ({
        method: 'POST'
        url: "/user/#{createdUser._id}/avatar"
        payload: fs.readFileSync('test/integration/test_image.png')
        headers:
          Authorization: "Bearer #{token}"
      })
    .then (res)->
      res.statusCode.should.equal 200
      should.exist res.result
      res.result.should.be.empty
      done()
    .done()

  it.skip 'should allow the user to download an avatar', (done)->
    req =
      url: "/user/#{createdUser._id}/avatar"
      headers:
        Authorization: "Bearer #{token}"

    s.server.inject req, (res)->
      res.statusCode.should.equal 200
      should.exist res.result

  after (done)->
    mongoose.disconnect()
    s.stop().then ->
      done()
