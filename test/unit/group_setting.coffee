should = require('chai').should()
GroupSetting = require '../../lib/model/groupSetting'
User = require '../../lib/model/user'
sinon = require 'sinon'
mongoose = require 'mongoose'
ObjectId = mongoose.Types.ObjectId
Q = require 'q'

describe 'GroupSetting', ->

  before (done)->
    mongoose.connect 'mongodb://localhost/test'
    db = mongoose.connection
    db.once 'open', ->
      Q.all([
        GroupSetting.removeQ({})
      ]).then -> done()

  groupSetting = null
  beforeEach ->
    groupSetting = new GroupSetting()

  describe 'Reading', ->

    it 'should read', ->
      groupSetting.unread.should.equal 0
      groupSetting.unread = 2
      groupSetting.unread.should.equal 2
      groupSetting.read()
      groupSetting.unread.should.equal 0


  describe 'finding for a group', ->

    it 'should find the group setting', ->
      groupId = new ObjectId()
      groupSetting1 = new GroupSetting(group: new ObjectId())
      groupSetting2 = new GroupSetting(group: groupId)
      groupSetting3 = new GroupSetting(group: new ObjectId())
      gses = [groupSetting1, groupSetting2, groupSetting3]
      gs = GroupSetting.forGroup(gses, groupId)
      should.exist gs
      gs.group.equals(groupId).should.be.true

    it 'should return null if not found', ->
      groupId = new ObjectId()
      groupSetting1 = new GroupSetting(group: new ObjectId())
      groupSetting2 = new GroupSetting(group: new ObjectId())
      groupSetting3 = new GroupSetting(group: new ObjectId())
      gses = [groupSetting1, groupSetting2, groupSetting3]
      gs = GroupSetting.forGroup(gses, groupId)
      should.not.exist gs

  describe 'calculating unread', ->

    it 'should return a promise', ->
      returned = GroupSetting.totalUnread()
      Q.isPromise(returned).should.be.true

    it 'should return 0 if given nothing', (done)->
      GroupSetting.totalUnread().then (unread)->
        unread.should.equal 0
        done()

    it 'should return 0 if given non sensical data', (done)->
      GroupSetting.totalUnread(hello: 'world').then (unread)->
        unread.should.equal 0
        done()

    it 'should use the User to calculate the total unread', (done)->
      user = new User()
      gs1 = new GroupSetting(group: new ObjectId(), unread: 2)
      gs2 = new GroupSetting(group: new ObjectId(), unread: 5)
      sinon.stub(GroupSetting, 'findQ').returns( Q([gs1, gs2]) )

      GroupSetting.totalUnread(user).then (unread)->
        unread.should.equal 7
        GroupSetting.findQ.restore()
        done()


    it 'should the gses to calculate the total unread', (done)->
      gs1 = new GroupSetting(group: new ObjectId(), unread: 3)
      gs2 = new GroupSetting(group: new ObjectId(), unread: 8)

      GroupSetting.totalUnread([gs1, gs2]).then (unread)->
        unread.should.equal 11
        done()

  after (done)->
    mongoose.disconnect()
    done()
