mongoose = require('mongoose-q')()
Schema = mongoose.Schema
Hash = require('hashish')
Boom = require('boom')
Q = require('q')
Message = require('./message')
async = require('async')
GroupSetting = require('./groupSetting')

###
 * Group
 * The group holds informatiom about the participants. Each group knows of
 * it's members (Users), and has a list of all the messages sent in the group.
 * It has a name that can be changed, and knows who has been invited to the group
 * (so invites can be cleared later).
###
Group = new Schema
  members : [{ type: Schema.Types.ObjectId, ref: 'User' }]
  leftMembers : [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }]
  messages : [{type: Schema.Types.ObjectId, ref: 'Message', default: [] }]
  lastMessage : { type: Schema.Types.ObjectId, ref: 'Message', default: null }
  name : {type: String, default: null}


Group.virtual('unread').get ->
  if @_unread then @_unread else 0

Group.virtual('unread').set (unread)->
  @_unread = unread

Group.set 'toObject', getters: true
Group.set 'toJSON', {getters: true, virtuals: true}


###
 * Sort
 * Sorts two objects, a and b, by their lastMessage.sent
 * property. If It doesn't exist on either object, then the
 * other is returned higher.
###
sort = (a, b)->
  return 1 unless a.lastMessage
  return -1 unless b.lastMessage

  first = a.lastMessage.sent
  second = b.lastMessage.sent
  if first < second then 1 else if first > second then -1 else 0

Group.methods =

  leave: (user)->
    Q.all([
      @removeMember user
      user.leave @
      @systemMessage user.username + ' has left the group.'
    ]).spread (group, usr, message)=>
        require('../socket/socket').messageToGroup @_id, 'member_left', message

  removeMember: (user)->
    index = @members.indexOfEquals user._id
    throw Boom.notFound() if index is -1
    @members.splice index, 1
    @leftMembers.push user._id
    @saveQ()

  systemMessage: (text)->
    mes = new Message
      from: null
      group: @_id
      text: text
      sent: new Date()
      type: 'system'
    @messages.push mes
    Q.all([
      @saveQ()
      mes.saveQ()
    ]).then ->
      mes

  add: (invitees)->
    throw Boom.badRequest 'invitees must be an Array!' unless Array.isArray(invitees)

    User = require '../model/user'
    deferred = Q.defer()

    async.each(invitees, (username, cb)=>

      User.findOneQ( username: username.toLowerCase() ).then (user)=>
        throw Boom.notFound() unless user
        Q.all([
          user.add(@)
          @addUser(user)
        ]).spread (user, group) =>
          @systemMessage(user.username + ' has joined the group.')
          .then (mes)-> [user, group, mes]
        .spread (user, group, message) =>
          @pushMessageToUser user, message
          cb()
      .catch(cb)
    (err)->
      return deferred.reject(err) if err
      deferred.resolve()
    )

    deferred.promise

  addUser: (user)->
    @members.push user._id
    @saveQ()

  pushMessageToUser: (user, message)->
    io = require('../socket/socket')
    io.messageToGroup @id, 'member_joined', message
    didSend = io.emitNewGroup user._id, @
    user.push( null, 'You have been added to the group: ' + @name, null, no ) unless didSend


  changeName: (name)->
    @name = name
    @systemMessage('Group name changed to ' + @name)
    .then (message)=>
      require('../socket/socket').messageToGroup @id, 'group_name', message

Group.statics =

  ###
  Gets the groups (and their unread count) for the user.
  ###
  groupsForUser: (user)->
    throw Boom.unauthorized() unless user

    Q.all([
      GroupSetting.findQ( user: user._id )
      @find( {members : user._id}, '_id members leftMembers name lastMessage')
        .populate('members', 'username avatar')
        .populate('leftMembers', 'username avatar')
        .populate('lastMessage')
        .execQ()
    ]).spread (gses, groups)=>
      return Q([]) unless groups
      groups.sort sort
      groups.forEach (g)=> @setUnread(g, gses)

      return groups

  setUnread: (group, gses)->
    index = gses.indexOfEquals group._id, 'group'
    if index > -1
      group.unread = gses[index].unread
    else
      group.unread = 0

  validateMembers: (members, user)->
    name.toLowerCase() for name in members
    User = require './user'

    User.findQ(username: { $in: members })
    .then (users)=>
      throw Boom.badRequest 'No users were found with those usernames!' if users.length is 0

      otherMembers = users.filter (u)-> not u._id.equals user._id
      if otherMembers.length is 0
        throw Boom.badRequest "You can't make a group with only yourself!"
      otherMembers

  ###
   * Helper method to create a new group. Ensures that the information passed in
   * is correct.
   *
   * @param Members - Required array of members who will be in the group
   * @param user - The user who created the group
   * @param message - Optional. The starting message for the group
   * param name - Optional. The name for the group
  ###
  newGroup: (members, user, message, name)->

    if typeof members is 'undefined' or members is null or (not Array.isArray members) or members.length is 0
      throw Boom.badRequest 'The "members" value must be a valid array of length 1!'

    throw Boom.unauthorized() unless user
    throw Boom.badRequest() unless message

    @validateMembers(members, user).then (members)=>
      membersWithUser = members.copy().pushed(user) # "pushed" returns array
      [
        members
        membersWithUser
        new @(name: name, members: membersWithUser)
      ]
    .spread (members, membersWithUser, group)=>
      membersWithUser.forEach (u)->
        u.add group

      @firstMessage(user, group, message).then (mes)=> [members, mes, group]
    .spread (members, mes, group)=>
      @findOne(
        { '_id' : group._id },
        '_id members leftMembers name lastMessage messages')
          .populate('members', 'username avatar')
          .populate('leftMembers', 'username avatar')
          .populate('lastMessage')
          .execQ().then (found)=> [members, mes, found]
    .spread (members, mes, group)=>

      # Emit a new message to socket users
      text = user.username + '@' + group.name + ': ' + message
      usersNotOn = []
      members.forEach (user)->
        if not require('../socket/socket').emitNewGroup user._id, group
          user.push(group, text, null, false)
      group

  firstMessage: (from, group, text)->
    mes = new Message
      from: from._id
      group: group._id
      text: text
      sent: new Date()

    group.messages.push mes._id
    group.lastMessage = mes._id
    Q.all([group.saveQ(), mes.saveQ()]).then -> mes

module.exports = mongoose.model('Group', Group)
