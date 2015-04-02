'use strict'
#
# FastChat
# 2015
#

should = require('chai').should()
Group = require '../../lib/model/group'
User = require '../../lib/model/user'
Message = require '../../lib/model/message'
GroupSetting = require '../../lib/model/groupSetting'
sinon = require 'sinon'
mongoose = require 'mongoose'
async = require 'async'
Q = require 'q'

describe 'Group', ->

  before (done)->
    mongoose.connect 'mongodb://localhost/test'
    db = mongoose.connection
    db.once 'open', ->
      User.remove {}, ->
        Group.remove {}, ->
          done()

  group = null
  beforeEach ->
    group = new Group()

  describe 'Unread', ->

    it 'Should have an unread method', ->
      group.unread.should.equal 0

    it 'should let you set the unread', ->
      group.set 'unread', 10
      group.unread.should.equal 10

    it 'should serialize the unread count', ->
      group.set 'unread', 10
      group.unread.should.equal 10
      group.toJSON().unread.should.equal 10


  describe 'Leaving', ->

    it 'should throw an error if the user is not in the group', ->
      user = new User(username: 'Bobby')
      (-> group.leave user).should.throw /Not Found/

    it 'should throw an erorr if the user is not in the group', ->
      user = new User(username: 'Bobby')
      (-> group.removeMember user).should.throw /Not Found/

    it 'should remove the member', (done)->
      user = new User(username: 'Bobby')
      group.members.push user._id
      group.leftMembers.should.have.length 0
      group.members.should.have.length 1

      sinon.stub(group, 'saveQ').returns( Q() )

      group.removeMember(user).then ->
        group.members.should.have.length 0
        group.leftMembers.should.have.length 1
        group.saveQ.restore()
        done()

    it 'should create a system message', (done)->
      group.systemMessage('my text').then (mes)->
        mes.type.should.equal 'system'
        mes.text.should.equal 'my text'
        mes.group.should.equal group._id
        should.not.exist mes.from
        done()

    it 'should let the user leave the group', (done)->
      user = new User(username: 'Bobby', password: 'password')
      user.groups.push group._id
      group.members.push user._id

      group.leftMembers.should.have.length 0
      group.members.should.have.length 1
      user.groups.should.have.length 1

      group.leave(user).then ->
        group.members.should.have.length 0
        group.leftMembers.should.have.length 1
        user.groups.should.have.length 0
        user.leftGroups.should.have.length 1
        done()


  describe 'Adding', ->

    it 'should throw when not an array', ->
      (-> group.add {}).should.throw /must be an Array/

    it 'should throw when the user is not found', (done)->
      sinon.stub(User, 'findOneQ').returns( Q(null) )
      group.add(['unknown']).catch (err)->
        err.message.should.equal 'Not Found'
        User.findOneQ.restore()
        done()

    it 'should add one user', ->
      user = new User()
      group.members.should.have.length 0
      promise = group.addUser user
      group.members.should.have.length 1
      (Q.isPromise promise).should.be.true

    it 'should push to a user', ->
      user = new User()
      pushed = sinon.spy(user, 'push')
      group.pushMessageToUser user, {}
      pushed.called.should.be.true

    it 'should add user to the group', (done)->
      user = new User(username: 'Timmy', password: 'testing')
      sinon.stub(User, 'findOneQ').returns( Q(user) )

      group.messages.should.have.length 0
      group.members.should.have.length 0
      user.groups.should.have.length 0
      group.add(['timmy']).then ->
        group.messages.should.have.length 1
        group.members.should.have.length 1
        user.groups.should.have.length 1
        User.findOneQ.restore()
        done()

  describe 'Changing the Name', ->

    it 'should change the name', (done)->
      should.not.exist group.name
      group.messages.should.have.length 0
      group.changeName('Whatever').then ->
        group.name.should.equal 'Whatever'
        group.messages.should.have.length 1
        done()

  describe 'Fetching', ->

    it 'should set the unread count', ->
      gs = new GroupSetting()
      gs.unread = 2
      gs.group = group._id
      group.unread.should.equal 0
      Group.setUnread group, [gs]
      group.unread.should.equal 2

    it 'should set unread to 0 if not found', ->
      group.unread.should.equal 0
      Group.setUnread group, []
      group.unread.should.equal 0

    it 'should throw if no user', ->
      (-> Group.groupsForUser()).should.throw /Unauthorized/

    it 'should return an empty around if nothing is found', (done)->
      user = new User(username: 'hello', password: 'testing')
      Group.groupsForUser(user).then (groups)->
        should.exist(groups)
        groups.should.have.length 0
        done()

    it 'should find the groups for a user', (done)->
      user = new User(username: 'hi', password: 'testing')

      count = 0
      addGroup = (cb)->
        count++
        group = new Group(members: [user])
        message = new Message(sent: new Date(), group: group._id)
        group.lastMessage = message
        user.groups.push group._id
        gs = new GroupSetting(user: user._id, group: group._id)
        Q.all([
          group.saveQ()
          gs.saveQ()
          user.saveQ()
          message.saveQ()
        ]).then -> cb()
          .catch(console.log)

      next = ->
        Group.groupsForUser(user)
        .then (groups)->
          should.exist groups
          groups.should.have.length 4
          done()

      async.whilst(
        (-> count < 4),
        ( (cb)-> addGroup(cb)),
        ( (err)-> next())
      )

  describe 'New Groups', ->

    it 'should throw when no users are found', (done)->
      Group.validateMembers([], {}).catch (err)->
        err.message.should.equal 'No users were found with those usernames!'
        done()

    it 'should fail when it only fiends you', (done)->
      user = new User(username: 'sup', password: 'testing')
      sinon.stub(User, 'findQ').returns( Q([user]) )
      Group.validateMembers(['sup'], user).catch (err)->
        err.message.should.equal "You can't make a group with only yourself!"
        User.findQ.restore()
        done()

    it 'should validate the other members', (done)->
      user = new User(username: 'sup2', password: 'testing')
      user1 = new User(username: 'testing', password: 'testing')
      user2 = new User(username: 'johnny', password: 'testing')
      sinon.stub(User, 'findQ').returns( Q([user1, user2]) )
      Group.validateMembers(['testing', 'johnny'], user).then (others)->
        should.exist others
        others.should.have.length 2
        User.findQ.restore()
        done()

    it 'should not take shit', ->
      (-> Group.newGroup()).should.throw /valid array/
      (-> Group.newGroup(null)).should.throw /valid array/
      (-> Group.newGroup({})).should.throw /valid array/
      (-> Group.newGroup(test: 1)).should.throw /valid array/
      (-> Group.newGroup([])).should.throw /valid array/

    it 'requires a user', ->
      (-> Group.newGroup(['hi'])).should.throw /Unauthorized/

    it 'should create a new group', (done)->
      user = new User(username: 'sup3', password: 'testing')
      user1 = new User(username: 'testing3', password: 'testing')
      user2 = new User(username: 'johnny3', password: 'testing')
      Q.all([user.saveQ(), user1.saveQ(), user2.saveQ()]).then ->
        Group.newGroup(['testing3', 'johnny3'], user, 'Hello world!', 'GROUP')
      .then (group)->
        should.exist group
        group.name.should.equal 'GROUP'
        group.members.should.have.length 3
        group.leftMembers.should.have.length 0
        should.exist group.lastMessage
        group.lastMessage.text.should.equal 'Hello world!'
        done()

    it 'should not give a default message', (done)->
      user = new User(username: 'sup4', password: 'testing')
      user1 = new User(username: 'testing4', password: 'testing')
      user2 = new User(username: 'johnny4', password: 'testing')
      Q.all([user.saveQ(), user1.saveQ(), user2.saveQ()]).then ->
        Group.newGroup(['testing4', 'johnny4'], user)
      .fail (err)->
        err.message.should.be.ok
        done()


  after (done)->
    mongoose.disconnect()
    done()
