var User = require('../model/user');
var Group = require('../model/group');
var Message = require('../model/message');
var ObjectId = require('mongoose-q')().Types.ObjectId; 
var io = require('../socket/socket');
var Boom = require('boom');
var GroupSetting = require('../model/groupSetting');

exports.getGroups = function(req, res, next) {

  Group.groupsForUser(req.user).then(function(groups) {
    res.json(groups);
  })
  .fail(next)
  .done();
};

exports.createGroup = function(req, res, next) {

  Group.newGroup(req.body.members, req.user, req.body.text, req.body.name)
    .then(function(group) {
      res.status(201).json(group);
    })
    .fail(next)
    .done();
};


// PUT /group/:id/leave
exports.leaveGroup = function(req, res, next) {

  var groupId = new ObjectId(req.params.id.toString());
  var user = req.user;

  Group.findOneQ({_id : groupId}).then(function(group) {
    if (!group) throw Boom.notFound()
    group.leave(user);
  }).then(function() {
    res.json({});
  })
  .fail(next)
  .done();
};

exports.changeSettings = function(req, res, next) {

  var groupId = new ObjectId(req.params.id.toString());
  var user = req.user;

  if (!user.hasGroup(groupId)) {
    return next(Boom.notFound());
  }

  Group.findOneQ({_id : groupId}).then(function(group) {
    if (!group) throw Boom.notFound()
    group.changeName(req.body.name, user);
  }).then(function() {
    res.json({});
  })
  .fail(next)
  .done();

};

exports.add = function(req, res, next) {

  var invites = req.body.invitees;
  var groupId = new ObjectId(req.params.id.toString());
  var user = req.user;

  if (!user.hasGroup(groupId)) {
    return next(Boom.notFound());
  }

  Group.findOneQ({ _id : groupId}).then(function(group) {
    if (!group) return next(404);
    return group.add(invites);
  }).then(function() {
    res.json({})
  })
  .fail(function(err) {
    next(err);
  })
  .done();

};
