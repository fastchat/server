'use strict'
#
# FastChat
# 2015
#

should = require('chai').should()
mongoose = require('mongoose-q')()
require('../../lib/helpers/helpers')()
Q = require 'q'
{User, Group, Message, GroupSetting} = require '../../lib/model'
Server = require '../../lib/server'
users = []
group = null
s = null
requestQ = null

describe 'Groups', ->

  before (done)->
    mongoose.connect process.env.MONGOLAB_URI
    db = mongoose.connection

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
        User.register('test3', 'test')
      ])
    .spread (user1, user2, user3)->
      Q([user1.login(), user2.login(), user3.login()])
    .spread (user1, user2, user3)->
      users.push(user1[1])
      users.push(user2[1])
      users.push(user3[1])
      done()
    .done()

  it 'should be empty for a brand new user', (done)->
    req =
      url: '/group'
      headers:
        Authorization: "Bearer #{users[0].accessToken[0]}"

    s.server.inject req, (res)->
      res.statusCode.should.equal 200
      res.headers['content-type'].should.match /json/
      res.result.should.be.empty
      done()

  it 'should not allow a user to create a group with no information', (done)->
    req =
      method: 'POST'
      url: '/group'
      payload: JSON.stringify({})
      headers:
        Authorization: "Bearer #{users[0].accessToken[0]}"

    s.server.inject req, (res)->
      res.statusCode.should.equal 400
      res.headers['content-type'].should.match /json/
      should.exist res.result.error
      done()

  it 'should not allow a user to create a group with no message', (done)->
    req =
      method: 'POST'
      url: '/group'
      payload: JSON.stringify({
        members: [users[1].username]
      })
      headers:
        Authorization: "Bearer #{users[0].accessToken[0]}"

    s.server.inject req, (res)->
      res.statusCode.should.equal 400
      res.headers['content-type'].should.match /json/
      should.exist res.result.error
      done()

  it 'should not allow a user to create a group with no members', (done)->
    req =
      method: 'POST'
      url: '/group'
      payload: JSON.stringify({
        text: 'This is a test message!'
      })
      headers:
        Authorization: "Bearer #{users[0].accessToken[0]}"

    s.server.inject req, (res)->
      res.statusCode.should.equal 400
      res.headers['content-type'].should.match /json/
      should.exist res.result.error
      done()

  it 'should not allow a group to be created if the only member invited is the caller', (done)->
    req =
      method: 'POST'
      url: '/group'
      payload: JSON.stringify({
        text: 'This is a test message!'
        members: [users[0].username]
      })
      headers:
        Authorization: "Bearer #{users[0].accessToken[0]}"

    s.server.inject req, (res)->
      res.statusCode.should.equal 400
      res.headers['content-type'].should.match /json/
      should.exist res.result.error
      done()


  it 'should not allow a user to create a group without an array', (done)->
    req =
      method: 'POST'
      url: '/group'
      payload: JSON.stringify({
        text: 'This is a test message!'
        members:
          test: 'test'
      })
      headers:
        Authorization: "Bearer #{users[0].accessToken[0]}"

    s.server.inject req, (res)->
      res.statusCode.should.equal 400
      res.headers['content-type'].should.match /json/
      should.exist res.result.error
      done()

  it 'should let a user to create a group with the proper info', (done)->
    req =
      method: 'POST'
      url: '/group'
      payload: JSON.stringify({
        text: 'Proper info group!'
        members: [users[1].username]
      })
      headers:
        Authorization: "Bearer #{users[0].accessToken[0]}"

    s.server.inject req, (res)->
      res.statusCode.should.equal 201
      res.headers['content-type'].should.match /json/

      created = res.result
      should.not.exist(created.name)
      created.members.should.have.length(2)
      created.leftMembers.should.be.empty
      should.exist(created._id)
      created.messages.should.have.length(1)
      group = created
      GroupSetting.findOneQ(user: users[0]._id).then (gs)->
        should.exist(gs)
        gs.unread.should.equal(0)
        gs.group.toString().should.equal(created._id.toString())
        GroupSetting.findOneQ(user: users[1]._id)
      .then (gs2)->
        should.exist(gs2)
        gs2.unread.should.equal(0)
        gs2.group.toString().should.equal(created._id.toString())
        done()
      .done()

  it 'should show the new group for the user who created it', (done)->
    req =
      url: '/group'
      headers:
        Authorization: "Bearer #{users[0].accessToken[0]}"

    s.server.inject req, (res)->
      res.statusCode.should.equal 200
      res.headers['content-type'].should.match /json/
      res.result.should.not.be.empty
      g = res.result[0]
      should.exist(g.unread)
      g.unread.should.equal(0)
      g.members.should.have.length(2)
      done()

  it 'should not allow a user not in the group to change the name', (done)->
    req =
      method: 'PUT'
      url: "/group/#{group._id}/settings"
      payload: JSON.stringify({
        name: 'New Group Name!'
      })
      headers:
        Authorization: "Bearer #{users[2].accessToken[0]}"

    s.server.inject req, (res)->
      res.statusCode.should.equal 404
      res.headers['content-type'].should.match /json/
      should.exist res.result.error
      done()


  it 'should not let a user change a group name with a bad id', (done)->
    badId = "#{group._id.toString()}111111"

    req =
      method: 'PUT'
      url: "/group/#{badId}/settings"
      payload: JSON.stringify({
        name: 'New Group Name!'
      })
      headers:
        Authorization: "Bearer #{users[0].accessToken[0]}"

    s.server.inject req, (res)->
      res.statusCode.should.equal 404
      res.headers['content-type'].should.match /json/
      should.exist res.result.error
      done()

  it 'should not let a user change a group name with a valid, but not found, id', (done)->
    anID = group._id
    anID = anID.toString().substr(0, anID.length - 4)
    anID = anID + '9999'

    req =
      method: 'PUT'
      url: "/group/#{anID}/settings"
      payload: JSON.stringify({
        name: 'New Group Name!'
      })
      headers:
        Authorization: "Bearer #{users[0].accessToken[0]}"

    s.server.inject req, (res)->
      res.statusCode.should.equal 404
      res.headers['content-type'].should.match /json/
      should.exist res.result.error
      done()

  it 'should let a user in the group change the group name', (done)->

    Message.findQ(group: group._id).then (messages)->
      messages.should.have.length(1)

      requestQ({
        method: 'PUT'
        url: "/group/#{group._id}/settings"
        payload: JSON.stringify({
          name: 'New Group Name!'
        })
        headers:
          Authorization: "Bearer #{users[0].accessToken[0]}"
      })
    .then (res)->
      res.statusCode.should.equal 200
      res.headers['content-type'].should.match /json/
      should.not.exist res.result.error
      Group.findOneQ(_id: group._id)
    .then (group)->
      should.exist(group)
      group.name.should.equal('New Group Name!')
      Message.findQ(group: group._id, {}, {sort: {sent: 1}})
    .then (messages)->
      messages.should.have.length(2)
      messages[1].text.should.equal('Group name changed to New Group Name!')
      messages[1].type.should.equal('system')
      done()

  it 'should not let you leave a group you are not in', (done)->
    req =
      method: 'PUT'
      url: "/group/#{group._id}/settings"
      payload: JSON.stringify({})
      headers:
        Authorization: "Bearer #{users[2].accessToken[0]}"

    s.server.inject req, (res)->
      res.statusCode.should.equal 404
      res.headers['content-type'].should.match /json/
      should.exist res.result.error
      done()

  it 'should let a user in the group leave', (done)->
    Message.findQ(group: group._id).then (messages)->
      messages.should.have.length(2)
      requestQ({
        method: 'PUT'
        url: "/group/#{group._id}/leave"
        payload: JSON.stringify({
          name: 'New Group Name!'
        })
        headers:
          Authorization: "Bearer #{users[1].accessToken[0]}"
      })
    .then (res)->
      res.statusCode.should.equal 200
      res.headers['content-type'].should.match /json/
      should.not.exist res.result.error
      Group.findOneQ(_id: group._id)
    .then (aGroup)->
      should.exist(aGroup)
      aGroup.members.should.have.length(1)
      aGroup.members.should.contain(users[0]._id.toString())
      aGroup.leftMembers.should.have.length(1)
      aGroup.leftMembers.should.contain(users[1]._id.toString())
      [aGroup, User.findOneQ(_id: users[1]._id)]
    .spread (aGroup, user)->
      user.groups.should.be.empty
      user.leftGroups.should.have.length(1)
      user.leftGroups.should.contain(aGroup._id)
      Message.findQ(group: aGroup._id, {}, {sort: {sent: 1}})
    .then (messages)->
      messages.should.have.length(3)
      messages[2].text.should.equal('test2 has left the group.')
      messages[2].type.should.equal('system')
      done()
    .done()

  it 'should return left groups in the user profile', (done)->
    req =
      url: '/user'
      headers:
        Authorization: "Bearer #{users[1].accessToken[0]}"

    s.server.inject req, (res)->
      res.statusCode.should.equal 200
      res.headers['content-type'].should.match /json/
      should.exist res.result.profile
      res.result.profile.groups.should.have.length(0)
      res.result.profile.leftGroups.should.have.length(1)
      left = res.result.profile.leftGroups[0]
      should.exist(left.name)
      should.exist(left._id)
      done()

  it 'it should fail to add nothing to a group', (done)->
    req =
      method: 'PUT'
      url: "/group/#{group._id}/add"
      payload: JSON.stringify({})
      headers:
        Authorization: "Bearer #{users[0].accessToken[0]}"

    s.server.inject req, (res)->
      res.statusCode.should.equal 400
      res.headers['content-type'].should.match /json/
      should.exist res.result.error
      done()

  it 'it should return OK if you add no one to a group', (done)->
    req =
      method: 'PUT'
      url: "/group/#{group._id}/add"
      payload: JSON.stringify({
        invitees: []
      })
      headers:
        Authorization: "Bearer #{users[0].accessToken[0]}"

    s.server.inject req, (res)->
      res.statusCode.should.equal 200
      res.headers['content-type'].should.match /json/
      should.not.exist res.result.error
      done()

  it 'it should not let a user add themselves', (done)->
    req =
      method: 'PUT'
      url: "/group/#{group._id}/add"
      payload: JSON.stringify({
        invitees: [users[0].username]
      })
      headers:
        Authorization: "Bearer #{users[0].accessToken[0]}"

    s.server.inject req, (res)->
      res.statusCode.should.equal 400
      res.headers['content-type'].should.match /json/
      should.exist res.result.error
      done()

  it 'Another user cannot add a user who has left a group', (done)->
    Group.findOneQ(_id: group._id).then (aGroup)->
      should.exist(aGroup)
      aGroup.members.should.have.length(1)
      aGroup.members.should.contain(users[0]._id.toString())
      aGroup.leftMembers.should.have.length(1)
      aGroup.leftMembers.should.contain(users[1]._id.toString())

      requestQ({
        method: 'PUT'
        url: "/group/#{group._id}/add"
        payload: JSON.stringify({
          invitees: [users[1].username]
        })
        headers:
          Authorization: "Bearer #{users[0].accessToken[0]}"
      })
    .then (res)->
      res.statusCode.should.equal 400
      res.headers['content-type'].should.match /json/
      should.exist res.result.error
      Group.findOneQ(_id: group._id)
    .then (aGroup2)->
      should.exist(aGroup2)
      aGroup2.members.should.have.length(1)
      aGroup2.members.should.contain(users[0]._id.toString())
      aGroup2.leftMembers.should.have.length(1)
      aGroup2.leftMembers.should.contain(users[1]._id.toString())
      done()
    .done()

  it 'it should let you add a new user to the group', (done)->
    requestQ({
      method: 'PUT'
      url: "/group/#{group._id}/add"
      payload: JSON.stringify({
        invitees: [users[2].username]
      })
      headers:
        Authorization: "Bearer #{users[0].accessToken[0]}"
      })
    .then (res)->
      res.statusCode.should.equal 200
      res.headers['content-type'].should.match /json/
      should.not.exist res.result.error
      Group.findOneQ(_id: group._id)
    .then (aGroup2)->
      should.exist(aGroup2)
      aGroup2.members.should.have.length(2)
      aGroup2.members.should.contain(users[0]._id.toString())
      aGroup2.members.should.contain(users[2]._id.toString())
      done()
    .done()

  after (done)->
    mongoose.disconnect()
    s.stop().then ->
      done()
