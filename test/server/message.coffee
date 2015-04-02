'use strict'
#
# FastChat
# 2015
#

should = require('chai').should()
supertest = require('supertest')
api = supertest('http://localhost:3000')
async = require('async')
mongoose = require('mongoose')
User = require('../../lib/model/user')
Group = require('../../lib/model/group')
Message = require('../../lib/model/message')
GroupSetting = require('../../lib/model/groupSetting')
tokens = []
users = []
theGroup = null
mediaMessage = null
AvatarTests = process.env.AWS_KEY? and process.env.AWS_SECRET?

io = require('socket.io-client')
socketURL = 'http://localhost:3000'

options =
  transports: ['websocket']
  'force new connection': true

describe 'Messages', ->

  before (done)->
    mongoose.connect 'mongodb://localhost/test'
    db = mongoose.connection

    async.series [
      (callback)->
        #
        # Remove all users
        #
        db.once 'open', ->
          User.remove {}, (err)->
            callback()
      (callback)->
        #
        # Add three users to seed our DB. We have to do it via the post request,
        # because registering does a lot more than just create a DB record. Plus,
        # this has already been tested, so we know it works.
        #
          api.post('/user')
            .send(username: 'test1', password: 'test')
            .end (err, res)->
              users.push(res.body)
              # Number 2
              api.post('/user')
                .send(username: 'test2', password: 'test')
                .end (err, res)->
                  users.push(res.body)
                  callback()

      (callback)->
        api.post('/login')
          .send(username: 'test1', password: 'test')
          .end (err, res)->
            tokens.push res.body.access_token
            # login second user
            api.post('/login')
              .send(username: 'test2', password: 'test')
              .end (err, res)->
                tokens.push res.body.access_token
                callback()
      (cb)->
        api.post('/group')
          .set('Authorization', "Bearer #{tokens[0]}")
          .send(text: 'First', members: [ users[1].username ] )
          .end (err, res)->
            theGroup = res.body
            cb()
    ], (err, results)->
      done()

  it 'should let a user connect to the socket.io server', (done)->
    options.query = 'token=' + tokens[0]
    client1 = io.connect(socketURL, options)
    client1.on 'connect', (data)->
      done()

  it 'should let a user upload an image', (done)->
    return done() unless AvatarTests
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

  it 'should let a user download an image', (done)->
    return done() unless AvatarTests
    api.get('/group/' + theGroup._id + '/message/' + mediaMessage._id + '/media')
      .set('Authorization', "Bearer #{tokens[0]}")
      .expect(200)
      .end (err, res)->
        should.not.exist(err)
        should.exist(res.body)
        res.headers['content-length'].should.equal('11026')
        done()

  it 'should get the messages from the group', (done)->
    l = if AvatarTests then 2 else 1
    api.get('/group/' + theGroup._id + '/message')
      .set('Authorization', "Bearer #{tokens[0]}")
      .expect(200)
      .end (err, res)->
        should.not.exist(err)
        should.exist(res.body)
        res.body.should.have.length(l)
        if AvatarTests
          res.body[0].text.should.equal('Example Text')
          res.body[1].text.should.equal('First')
        else
          res.body[0].text.should.equal('First')
        done()

  it 'should return a 404 if you try and get messages to a non-existant group', (done)->
    fakeId = mongoose.Types.ObjectId()
    api.get('/group/' + fakeId + '/message')
      .set('Authorization', "Bearer #{tokens[0]}")
      .expect(404)
      .end (err, res)->
        should.not.exist(err)
        should.exist(res.body)
        done()

  after (done)->
    mongoose.disconnect()
    done()
