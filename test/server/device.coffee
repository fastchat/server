'use strict'
#
# FastChat
# 2015
#

should = require('chai').should()
supertest = require('supertest')
api = supertest('http://localhost:3000')
mongoose = require('mongoose')
async = require('async')
User = require('../../lib/model/user')
tokens = []
users = []

describe 'Devices', ->

  before (done)->
    @timeout(4000)
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

      (cb)->
        #
        # Add three users to seed our DB. We have to do it via the post request,
        # because registering does a lot more than just create a DB record. Plus,
        # this has already been tested, so we know it works.
        #
        api.post('/user')
        .send(username: 'test1', password: 'test')
        .end (err, res)->
          users.push res.body
          cb()
      (cb)->
        api.post('/login')
        .send(username: 'test1', password: 'test')
        .end (err, res)->
          tokens.push res.body.access_token
          cb()
    ], (err, results)->
      tokens.should.have.length 1
      done()


  it 'should be empty when you first request a token', (done)->
    api.get('/user/device')
      .set('Authorization', "Bearer #{tokens[0]}")
      .expect(200)
      .expect('Content-Type', /json/)
      .end (err, res)->
        should.not.exist(err)
        should.exist(res.body)
        res.body.should.be.empty
        done()

  it 'should return an error if you send nothing in the post request', (done)->
    api.post('/user/device')
      .set('Authorization', "Bearer #{tokens[0]}")
      .send({})
      .expect(400)
      .expect('Content-Type', /json/)
      .end (err, res)->
        should.not.exist(err)
        should.exist(res.body)
        should.exist(res.body.error)
        done()

  it 'should return an error if you send not ios or android', (done)->
    api.post('/user/device')
      .set('Authorization', "Bearer #{tokens[0]}")
      .send(token: 'something', type: 'windows_phone')
      .expect(400)
      .expect('Content-Type', /json/)
      .end (err, res)->
        should.not.exist(err)
        should.exist(res.body)
        should.exist(res.body.error)
        done()

  it 'should let you create an iOS device', (done)->
    api.post('/user/device')
      .set('Authorization', "Bearer #{tokens[0]}")
      .send(token: 'somethingcool', type: 'ios')
      .expect(201)
      .expect('Content-Type', /json/)
      .end (err, res)->
        should.not.exist(err)
        should.exist(res.body)
        done()

  it 'should let you create an Android device', (done)->
    api.post('/user/device')
      .set('Authorization', "Bearer #{tokens[0]}")
      .send(token: 'awesometoken', type: 'android')
      .expect(201)
      .expect('Content-Type', /json/)
      .end (err, res)->
        should.not.exist(err)
        should.exist(res.body)
        done()

  it 'should update your device if you sent in the same token', (done)->
    api.post('/user/device')
      .set('Authorization', "Bearer #{tokens[0]}")
      .send(token: 'somethingcool', type: 'ios')
      .expect(200)
      .expect('Content-Type', /json/)
      .end (err, res)->
        should.not.exist(err)
        should.exist(res.body)
        done()

  it 'should show all your devices when you request them', (done)->
    api.get('/user/device')
      .set('Authorization', "Bearer #{tokens[0]}")
      .expect(200)
      .expect('Content-Type', /json/)
      .end (err, res)->
        should.not.exist(err)
        should.exist(res.body)
        res.body.should.have.length(2)
        done()

  after (done)->
    mongoose.disconnect()
    done()
