'use strict'
#
# FastChat
# 2015
#

should = require('chai').should()
async = require('async')
mongoose = require('mongoose-q')()
io = require('socket.io-client')
require('../../lib/helpers/helpers')()
{User, Group, Message, GroupSetting} = require '../../lib/model'
Server = require '../../lib/server'
Q = require 'q'
users = []
theGroup = null
mediaMessage = null
s = null
requestQ = null
socketURL = 'http://localhost:3000'

options =
  transports: ['websocket']
  'force new connection': true

describe 'Messages', ->

  before (done)->
    mongoose.connect 'mongodb://localhost/test'

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
      Q.all([
        User.register('test1', 'test')
        User.register('test2', 'test')
      ])
    .spread (user1, user2)->
      Q([user1.login(), user2.login()])
    .spread (user0, user1)->
      users.push(user0[1])
      users.push(user1[1])
      Group.newGroup([user1[1].username], user0[1], 'first')
    .then (group)->
      theGroup = group
      done()
    .done()

  it 'should let a user connect to the socket.io server', (done)->
    options.query = "token=#{users[0].accessToken[0]}"
    client1 = io.connect(socketURL, options)
    client1.on 'connect', (data)->
      client1.disconnect()
      done()

  it.skip 'should let a user upload an image', (done)->
    @timeout(5000)
    text = 'Example Text'
    req = api.post('/group/' + theGroup._id + '/message')

    req.set('Authorization', "Bearer #{tokens[0]}")
    req.field('text', text)
    req.attach('media', './test/integration/test_image.png')
    req.end (err, res)->
      should.not.exist(err)
      should.exist(res.body)
      res.body.group.should.equal(theGroup._id)
      res.body.text.should.equal(text)
      res.body.hasMedia.should.equal(true)
      res.body.media_size[0].should.equal(7762)
      should.exist(res.body.media)
      res.body.mediaHeader[0].should.equal('image/png')
      mediaMessage = res.body
      done()

  it.skip 'should let a user download an image', (done)->
    api.get('/group/' + theGroup._id + '/message/' + mediaMessage._id + '/media')
      .set('Authorization', "Bearer #{tokens[0]}")
      .expect(200)
      .end (err, res)->
        should.not.exist(err)
        should.exist(res.body)
        res.headers['content-length'].should.equal('11026')
        done()

  it 'should get the messages from the group', (done)->
    req =
      url: "/group/#{theGroup._id}/message"
      headers:
        Authorization: "Bearer #{users[0].accessToken[0]}"

    s.server.inject req, (res)->
      console.log 'res', res.result
      res.statusCode.should.equal 200
      res.headers['content-type'].should.match /json/
      res.result.should.have.length 1 #no image upload
      res.result[0].text.should.equal('first')
#      res.result[1].text.should.equal('First')
      done()

  it 'should get the messages from the group with a query token', (done)->
    req =
      url: "/group/#{theGroup._id}/message?access_token=#{users[0].accessToken[0]}"

    s.server.inject req, (res)->
      console.log 'res', res.result
      res.statusCode.should.equal 200
      res.headers['content-type'].should.match /json/
      res.result.should.have.length 1 #no image upload
      res.result[0].text.should.equal('first')
#      res.result[1].text.should.equal('First')
      done()

  it 'should return a 404 if you try and get messages to a non-existant group', (done)->
    fakeId = mongoose.Types.ObjectId()
    req =
      url: "/group/#{fakeId}/message"
      headers:
        Authorization: "Bearer #{users[0].accessToken[0]}"

    s.server.inject req, (res)->
      res.statusCode.should.equal 404
      res.headers['content-type'].should.match /json/
      should.exist res.result
      done()

  after (done)->
    mongoose.disconnect()
    s.stop().then ->
      done()
