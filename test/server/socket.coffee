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
io = require('socket.io-client')
socketURL = 'http://localhost:3000'
options =
  transports: ['websocket']
  'force new connection': true


describe 'Socket.io', ->

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
              # Number 2
              api.post('/user')
                .send(username: 'test2', password: 'test')
                .end (err, res)->
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
        api.post('/user/device')
          .set('Authorization', "Bearer #{tokens[1]}")
          .send(token: 'somethingcool', type: 'ios')
          .expect(201)
          .expect('Content-Type', /json/)
          .end (err, res)->
            should.not.exist(err)
            should.exist(res.body)
            api.post('/user/device')
              .set('Authorization', "Bearer #{tokens[1]}")
              .send(token: 'awesometoken', type: 'android')
              .expect(201)
              .expect('Content-Type', /json/)
              .end (err, res)->
                should.not.exist(err)
                should.exist(res.body)
                cb()
      (callback)->
        #
        # Add a group for both members
        #
        api.post('/group')
          .set('Authorization', "Bearer #{tokens[0]}")
          .send(text: 'This is a test message!', members: ['test2'])
          .expect(201)
          .expect('Content-Type', /json/)
          .end (err, res)-> callback()
      (callback)->
        #
        # Add a group for both members
        #
        api.get('/user')
          .set('Authorization', "Bearer #{tokens[0]}")
          .expect(200)
          .expect('Content-Type', /json/)
          .end (err, res)->
            users.push(res.body.profile)

            api.get('/user')
              .set('Authorization', "Bearer #{tokens[1]}")
              .expect(200)
              .expect('Content-Type', /json/)
              .end (err, res)->
                users.push(res.body.profile)
                callback()
    ], (err, results)->
      done()

  it 'should not let a user connect without a session token', (done)->
    client = io.connect(socketURL, options)
    client.on 'connect'
    client.on 'error', (err)->
      should.exist(err)
      done()

  it 'should not let a user connect with a false session token', (done)->
    options.query = 'token=33'
    client = io.connect socketURL, options

    client.on 'connect'
    client.on 'error', (err)->
      should.exist(err)
      done()

  it 'should let a user connect to the socket.io server with a proper token', (done)->
    options.query = 'token=' + tokens[0]
    client = io.connect socketURL, options

    client.on 'connect', (data)->
      client.disconnect()
      done()

  it 'should send a message when the client has connected', (done)->
    options.query = 'token=' + tokens[0]
    client = io.connect(socketURL, options)

    client.on 'connect', (data)->
      should.not.exist(data)

    client.on 'connected', (data)->
      should.exist(data)
      data.should.equal('FastChat')
      client.disconnect()
      done()


  it 'should not send a typing message if nothing is sent', (done)->
    options.query = 'token=' + tokens[0]
    client1 = io.connect(socketURL, options)

    client1.on 'connect', (data)->
      should.not.exist(data)

      options.query = 'token=' + tokens[1]
      client2 = io.connect(socketURL, options)

      client2.on 'connect', (data)->
        should.not.exist(data)
        #
        # We are ready to go
        #
        client1.emit 'typing', {} # should not crash the server
        client1.disconnect()
        client2.disconnect()
        done()

  it 'should send typing=false if you do not specify anything', (done)->
    options.query = 'token=' + tokens[0]
    client1 = io.connect(socketURL, options)

    client1.on 'connect', (data)->
      should.not.exist(data)

      options.query = 'token=' + tokens[1]
      client2 = io.connect(socketURL, options)

      client2.on 'connect', (data)->
        should.not.exist(data)

        client2.on 'typing', (typing)->
          should.exist(typing)
          typing.typing.should.equal(false)
          typing.from.should.equal(users[0]._id)
          client1.disconnect()
          client2.disconnect()
          done()

        #
        # We are ready to go
        #
        client1.emit('typing', group: users[0].groups[0]._id)

  it 'should send typing=true if you specify true', (done)->
    options.query = 'token=' + tokens[0]
    client1 = io.connect(socketURL, options)

    client1.on 'connect', (data)->
      should.not.exist(data)
      options.query = 'token=' + tokens[1]
      client2 = io.connect(socketURL, options)

      client2.on 'connect', (data)->
        should.not.exist(data)

        client2.on 'typing', (typing)->
          should.exist(typing)
          typing.typing.should.equal(true)
          typing.from.should.equal(users[0]._id)
          client1.disconnect()
          client2.disconnect()
          done()

        #
        # We are ready to go
        #
        client1.emit('typing', { group: users[0].groups[0]._id, typing: true })


  it 'should send typing=true if you specify a truethy value', (done)->
    options.query = 'token=' + tokens[0]
    client1 = io.connect(socketURL, options)

    client1.on 'connect', (data)->
      should.not.exist(data)

      options.query = 'token=' + tokens[1]
      client2 = io.connect(socketURL, options)

      client2.on 'connect', (data)->
        should.not.exist(data)

        client2.on 'typing', (typing)->
          should.exist(typing)
          typing.typing.should.equal(true)
          typing.from.should.equal(users[0]._id)
          client1.disconnect()
          client2.disconnect()
          done()
        #
        # We are ready to go
        #
        client1.emit('typing', { group: users[0].groups[0]._id, typing: 'yes' })


  it 'should send a message', (done)->
    acknowledgement = null

    Group.findOne _id: users[0].groups[0]._id, (err, group)->
      should.not.exist(err)
      should.exist(group)
      group.messages.should.have.length(1)

      options.query = 'token=' + tokens[0]
      client1 = io.connect(socketURL, options)

      client1.on 'connect', (data)->
        should.not.exist(data)

        options.query = 'token=' + tokens[1]
        client2 = io.connect(socketURL, options)

        client2.on 'connect', (data)->
          should.not.exist(data)

          client2.on 'message', (message)->
            should.exist(message)
            message.text.should.equal('Test Message!')
            message.from.should.equal(users[0]._id)
            should.exist(message.sent)
            should.exist(message.hasMedia)
            message.hasMedia.should.equal(false)
            #
            # Validate the message was added to the group. Why the timeout?
            # Otherwise, we query the database *before* the message gets added
            # to it, so it's not associated yet. One second later, we're pretty
            # sure it is.
            setTimeout( (->
              Group.findOne _id: users[0].groups[0]._id, (err2, group2)->
                should.not.exist(err2)
                should.exist(group2)
                group2.messages.should.have.length(2)

                Message.findOne _id: message._id, (err3, aMes)->
                  should.not.exist(err3)
                  aMes._id.toString().should.equal(message._id.toString())
                  aMes.group.toString().should.equal(users[0].groups[0]._id.toString())
                  aMes.text.should.equal(message.text)
                  client1.disconnect()
                  client2.disconnect()
                  should.exist(acknowledgement)
                  done()
            ), 1000)

          #
          # We are ready to go
          #
          client1.emit 'message',
          {
            group: users[0].groups[0]._id
            text: 'Test Message!'
          }, (ack)->
            should.exist(ack)
            acknowledgement = ack

  it 'should not send a message if the group is not included', (done)->
    @timeout 5000

    options.query = 'token=' + tokens[0]
    client1 = io.connect(socketURL, options)

    client1.on 'connect', (data)->
      should.not.exist(data)

      options.query = 'token=' + tokens[1]
      client2 = io.connect(socketURL, options)

      client2.on 'connect', (data)->
        should.not.exist(data)

        client2.on 'message', (message)->
          should.fail('You should not ge this message!')

        # We are ready to go
        acknowledgement = null
        client1.emit 'message',
        {
          text: 'Test Message!'
        }, (ack)->
          acknowledgement = ack

        setTimeout( (->
          should.exist(acknowledgement)
          should.exist(acknowledgement.error)
          client1.disconnect()
          client2.disconnect()
          done()
        ), 4500)


  it 'should not send a message if the text is not included', (done)->
    @timeout 5000
    options.query = 'token=' + tokens[0]
    client1 = io.connect(socketURL, options)

    client1.on 'connect', (data)->
      should.not.exist(data)

      options.query = 'token=' + tokens[1]
      client2 = io.connect(socketURL, options)

      client2.on 'connect', (data)->
        should.not.exist(data)

        client2.on 'message', (message)->
          should.fail('You should not ge this message!')


        acknowledgement = null
        client1.emit 'message',
        {
          group: users[0].groups[0]._id
        }, (ack)->
          acknowledgement = ack

        setTimeout( (->
          should.exist(acknowledgement)
          should.exist(acknowledgement.error)
          client1.disconnect()
          client2.disconnect()
          done()
        ), 4500)


  it 'should not send a media message', (done)->
    options.query = 'token=' + tokens[0]
    client1 = io.connect(socketURL, options)
    acknowledgement = null
    client1.on 'connect', (data)->
      should.not.exist(data)

      options.query = 'token=' + tokens[1]
      client2 = io.connect(socketURL, options)

      client2.on 'connect', (data)->
        should.not.exist(data)

        client2.on 'message', (message)->
          should.exist(message)
          message.text.should.equal('Test Message!')
          message.from.should.equal(users[0]._id)
          should.exist(message.sent)
          should.exist(message.hasMedia)
          message.hasMedia.should.equal(false)
          should.exist(acknowledgement)
          should.exist(acknowledgement._id)
          client1.disconnect()
          client2.disconnect()
          done()

        #
        # We are ready to go
        #
        client1.emit 'message',
        {
          group: users[0].groups[0]._id
          text: 'Test Message!'
        }, (ack)->
          'Got ack'
          acknowledgement = ack


  after (done)->
    mongoose.disconnect()
    done()
