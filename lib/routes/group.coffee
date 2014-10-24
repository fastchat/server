Group = require('../model/group')
ObjectId = require('mongoose-q')().Types.ObjectId
Boom = require('boom')

exports.getGroups = (req, res, next)->

  Group.groupsForUser(req.user).then (groups)->
    res.json(groups)
  .fail(next)
  .done()


exports.createGroup = (req, res, next)->

  Group.newGroup(req.body.members, req.user, req.body.text, req.body.name)
    .then (group)->
      res.status(201).json(group)
    .fail(next)
    .done()


# PUT /group/:id/leave
exports.leaveGroup = (req, res, next)->
  id = new ObjectId(req.params.id.toString())
  user = req.user

  Group.findOneQ(_id : id).then (group)->
    throw Boom.notFound() unless group
    group.leave(user)
  .then ->
    res.json({})
  .fail(next)
  .done()


exports.changeSettings = (req, res, next)->
  groupId = new ObjectId(req.params.id.toString())
  user = req.user

  return next(Boom.notFound()) unless user.hasGroup(groupId)

  Group.findOneQ(_id : groupId).then (group)->
    throw Boom.notFound() unless group
    group.changeName req.body.name, user
  .then ->
    res.json({})
  .fail(next)
  .done()


exports.add = (req, res, next)->
  invites = req.body.invitees
  groupId = new ObjectId(req.params.id.toString())
  user = req.user
  return next Boom.notFound() unless user.hasGroup(groupId)

  Group.findOneQ(_id : groupId).then (group)->
    return next(404) unless group
    group.add invites
  .then ->
    res.json({})
  .fail(next)
  .done()
