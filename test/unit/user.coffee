mongoose = require 'mongoose'
Q = require 'Q'
sinon = require 'sinon'
ObjectId = mongoose.Types.ObjectId
should = require('chai').should()
User = require '../../lib/model/user'
Device = require '../../lib/model/device'
Group = require '../../lib/model/group'


describe 'User', ->

  before (done)->
    mongoose.connect 'mongodb://localhost/test'
    db = mongoose.connection
    db.once 'open', ->
      User.removeQ({}).then -> done()

  user = null
  beforeEach ->
    user = new User()


  describe 'Model', ->

    it 'should be a user', ->
      user = new User()
      (user instanceof User).should.be.ok

  describe 'Authentication', ->

    it 'should hash the password', (done)->
      user.username = 'hey'
      user.password = 'testing'
      user.saveQ().then ->
        user.password.should.not.equal 'testing'
        done()


    it 'should make a random token', ->
      user = new User()
      result = user.generateRandomToken()
      should.exist result

    it 'should compare correct passwords', (done)->
      user.username = 'hey0'
      user.password = 'testing'
      user.saveQ().then ->
        user.comparePassword('testing')
      .then (matched)->
        should.exist matched
        matched.should.be.true
        done()

    it 'should compare incorrect passwords', (done)->
      user.username = 'heyo'
      user.password = 'testing'
      user.saveQ().then ->
        user.comparePassword('mypassword')
      .catch (err)->
        err.message.should.equal 'Incorrect username or password'
        done()


  describe 'Push', ->
    it 'should push to all the users devices', (done)->
      d1 = new Device()
      spy1 = sinon.spy(d1, 'send')
      d2 = new Device()
      spy2 = sinon.spy(d2, 'send')
      sinon.stub(Device, 'findQ').returns( Q([d1, d2]) )
      user.push().then ->
        spy1.calledOnce.should.be.true
        spy2.calledOnce.should.be.true
        Device.findQ.restore()
        done()

  describe 'Groups', ->

    it 'should throw when not found', ->
      (-> user.leave(new Group())).should.throw /Not Found/

    it 'should leave a group', ->
      user.groups.should.have.length 0
      group = new Group()
      user.groups.push group
      user.groups.should.have.length 1
      user.leave group
      user.groups.should.have.length 0
      user.leftGroups.should.have.length 1

    it 'should add a group', ->
      user.groups.should.have.length 0
      group = new Group()
      user.add group
      user.groups.should.have.length 1

    it 'should not add a group twice', ->
      user.groups.should.have.length 0
      group = new Group()
      user.add group
      (-> user.add(group)).should.throw /cannot be readded/

    it 'should not allow a user to be added to a group they left', ->
      user.groups.should.have.length 0
      group = new Group()
      user.add group
      user.leave group
      (-> user.add(group)).should.throw /cannot be readded/

    it 'should returns no if nothing is passed in', ->
      user.hasGroup().should.be.no

    it 'should return no if it is not an object id', ->
      user.hasGroup('dkfjdsf').should.be.no

    it 'should return no if the user does not have the group', ->
      user.hasGroup(new ObjectId()).should.be.no

    it 'should return yes when they have the group', ->
      group = new Group()
      id = group._id
      user.groups.push group
      user.hasGroup(id).should.be.yes

  describe 'Logout', ->

    it 'should remove the one token', (done)->
      user.username = 'test123'
      user.password = 'testing'
      user.accessToken = [
        '111'
        '222'
        '333'
        '444'
        '555'
        ]

      sinon.stub(Device, 'findQ').returns( Q([]) )
      user.logout('111').then ->
        user.accessToken.should.have.length 4
        User.findOneQ(username: 'test123').then (u)->
          should.exist u
          u.accessToken.should.have.length 4
          Device.findQ.restore()
          done()

    it 'should remove all the tokens', (done)->
      user.username = 'test1234'
      user.password = 'testing'
      user.accessToken = [
        '111'
        '222'
        '333'
        '444'
        '555'
        ]

      sinon.stub(Device, 'findQ').returns( Q([new Device()]) )
      user.logout('111', yes).then ->
        user.accessToken.should.have.length 0
        User.findOneQ(username: 'test1234').then (u)->
          should.exist u
          u.accessToken.should.have.length 0
          Device.findQ.restore()
          done()

  describe 'Avatars', ->
    upload =
      avatar: [
        {
          path: './test/integration/test_image.png'
          headers:
            'content-type': 'image/png'
          size: 7762
        }
      ]

    it 'should throw an error with no files', ->
      (-> user.uploadAvatar()).should.throw /No files were found/

    it 'should throw an error with no avatar', ->
      (-> user.uploadAvatar({})).should.throw /Avatar was not found/

    it 'should throw an error with no avatar file', ->
      (-> user.uploadAvatar(avatar: [])).should.throw /Avatar was not found/

    it 'should throw an error with an unsupported file', ->
      testUpload =
        avatar: [
          {
            path: './test/integration/test_image.png'
            headers:
              'content-type': 'whatever'
            size: 7762
          }
        ]
      (-> user.uploadAvatar(testUpload)).should.throw /File is not a supported/

    avatarId = null
    it 'should upload the avatar', (done)->
      user.username = 'uploader'
      user.password = 'testing'
      should.not.exist user.avatar
      user.uploadAvatar(upload).then ->
        should.exist user.avatar
        avatarId = user.avatar
        done()
      .catch(console.log)

    it 'should throw without an avatar', ->
      (-> user.getAvatar()).should.throw /Not Found/

    it 'should pull down the avatar', (done)->
      User.findOneQ(username: 'uploader').then (found)->
        found.getAvatar()
      .spread (type, data)->
        should.exist type
        should.exist data
        type.should.equal 'image/jpeg'
        done()

  describe 'Registering', ->

    it 'should throw without a username', ->
      (-> User.register()).should.throw /Username is required/

    it 'should throw without a password', ->
      (-> User.register('username')).should.throw /Password is required/

    it 'should throw with a bad username', ->
      (-> User.register('GG no re', 'testing')).should.throw /Invalid username/

    it 'should register the user', ->
      User.register('hello', 'testing').then (found)->
        found.username.should.equal 'hello'
        should.exist found.password

    it 'should throw when finding a nonexistent user', (done)->
      User.findByLowercaseUsername('boby').catch (err)->
        err.message.should.equal 'Incorrect username!'
        done()

    it 'should find the user', (done)->
      User.findByLowercaseUsername('uploader').then (found)->
        should.exist found
        found.username.should.equal 'uploader'
        done()
