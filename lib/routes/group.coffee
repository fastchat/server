Group = require('../model/group')
ObjectId = require('mongoose-q')().Types.ObjectId
Boom = require('boom')

getGroups = (req, reply)->
  {user} = req.auth.credentials
  Group.groupsForUser(user).then (groups)->
    reply(groups)
  .fail(reply)
  .done()

createGroup = (req, reply)->
  Group.newGroup(req.body.members, req.user, req.body.text, req.body.name)
  .then (group)->
    reply(group).code(201)
  .fail(reply)
  .done()

# PUT /group/:id/leave
leaveGroup = (req, reply)->
  {user} = req.auth.credentials
  id = new ObjectId(req.params.id)

  Group.findOneQ(_id : id).then (group)->
    throw Boom.notFound() unless group
    group.leave(user)
  .then ->
    reply({})
  .fail(reply)
  .done()

changeSettings = (req, reply)->
  {user} = req.auth.credentials
  groupId = new ObjectId(req.params.id)

  return next(Boom.notFound()) unless user.hasGroup(groupId)

  Group.findOneQ(_id : groupId).then (group)->
    throw Boom.notFound() unless group
    group.changeName req.payload.name, user
  .then ->
    reply()
  .fail(reply)
  .done()

add = (req, reply)->
  {user} = req.auth.credentials
  invites = req.payload.invitees
  groupId = new ObjectId(req.params.id)

  return next Boom.notFound() unless user.hasGroup(groupId)

  Group.findOneQ(_id : groupId).then (group)->
    throw Boom.notFound() unless group
    group.add(invites)
  .then ->
    reply()
  .fail(reply)
  .done()

module.exports = [
  {
    method: 'GET'
    path: '/group'
    handler: getGroups
  }
  {
    method: 'POST'
    path: '/group'
    handler: createGroup
  }
  {
    method: 'PUT'
    path: '/group/{id}/leave'
    handler: leaveGroup
  }
  {
    method: 'PUT'
    path: '/group/{id}/settings'
    handler: changeSettings
  }
  {
    method: 'PUT'
    path: '/group/{id}/add'
    handler: add
  }
]
