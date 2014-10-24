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


virtual = Group.virtual 'fullname'

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

    index = @members.indexOfEquals user._id
    throw Boom.notFound() if index is -1

    @members.splice index, 1
    @leftMembers.push user._id
    @saveQ().then =>
      index = user.groups.indexOfEquals @id
      throw Boom.notFound() if index is -1

      user.groups.splice index, 1
      user.leftGroups.push @id
      user.saveQ()
    .then =>
      aMessage = new Message
        from: null
        group: @id
        text: user.username + ' has left the group.'
        sent: new Date()
        type: 'system'

      aMessage.saveQ().then =>
        require('../socket/socket').messageToGroup @id, 'member_left', aMessage

  add: (invitees)->
    throw 'invitees must be an Array!' if not Array.isArray invitees

    User = require '../model/user'
    deferred = Q.defer()

    async.each invitees, (username, cb)=>

      User.findOneQ( username: username.toLowerCase() ).then (user)=>
        throw Boom.notFound() unless user

        ###
        Don't add to the group if the user has left the group
        ###
        index = user.leftGroups.indexOfEquals @id
        index2 = user.groups.indexOfEquals @id
        throw 'A user who left cannot be readded!' if index isnt -1 or index2 isnt -1

        ###
        Each member in the group gets a GroupSetting object
        ###
        setting = new GroupSetting
          user: user._id
          group: @id

        setting.saveQ()
        user.groupSettings.push setting._id
        @members.push user._id
        @saveQ().then => user
      .then (user)=>
        user.groups.push @id
        user.saveQ().then => user

      .then (user)=>
        aMessage = new Message
          from: null
          group: @id
          text: user.username + ' has joined the group.'
          sent : new Date()
          type : 'system'
        aMessage.saveQ()
        io = require('../socket/socket')
        io.messageToGroup @id, 'member_joined', aMessage
        #This is broken...
        didSend = io.emitNewGroup user._id, @
        user.push( null, 'You have been added to the group: ' + @name, null, no ) unless didSend
        cb()
      .catch (err)->
        cb err
    (err)->
      return deferred.reject(err) if err
      deferred.resolve()

    return deferred.promise

  changeName: (name, user)->
    @name = name
    @saveQ().then =>
      aMessage = new Message
        from: null
        group: @id
        text: 'Group name changed to  ' + @name
        sent: new Date()
        type: 'system'

      return aMessage.saveQ().then =>
        require('../socket/socket').messageToGroup @id, 'group_name', aMessage

Group.statics =

  ###
  Gets the groups (and their unread count) for the user.
  ###
  groupsForUser: (user)->
    throw Boom.unauthorized() unless user

    Q.all([
      GroupSetting.findQ( user: user.id )
      @find( {members : user.id}, '_id members leftMembers name lastMessage')
        .populate('members', 'username avatar')
        .populate('leftMembers', 'username avatar')
        .populate('lastMessage')
        .execQ()
    ]).spread (gses, groups)=>
      return Q([]) unless groups
      groups.sort sort

      # For each group - find the group setting object associated with it
      # and if it exists, add the unread count to this group
      groups.forEach (g)->
        index = gses.indexOfEquals g.id, 'group'
        if index > -1
          g.unread = gses[index].unread
        else
          g.unread = 0
      return groups

  validateMembers: (members, user)->
    name.toLowerCase() for name in members
    User = require './user'

    User.find(username: { $in: members }).execQ()
      .then (users)=>
        throw Boom.badRequest 'No users were found with those usernames!' if users.length is 0

        otherMembers = users.filter (u)-> not u.id.equals user.id
        throw Boom.badRequest "You can't make a group with only yourself!" if otherMembers.length is 0

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

    if typeof members is 'undefined' or members is null or not Array.isArray members or members.length is 0
      throw Boom.badRequest 'The "members" value must be a valid array of length 1!'

    throw Boom.unauthorized() unless user
    message = 'Hello!' unless message

    @validateMembers(members, user).then (members)=>
      membersWithUser = members.slice(0)
      membersWithUser.push(user)
      [members, membersWithUser, new @(name: name, members: membersWithUser)]
    .spread (members, membersWithUser, group)=>

      membersWithUser.forEach (u)->
        u.groups.push group.id

        # Each member in the group gets a GroupSetting object
        setting = new GroupSetting
          user: u.id
          group: group.id

        setting.saveQ()
        u.groupSettings.push setting.id
        u.saveQ()

      aMessage = new Message
        from: user.id
        group: group.id
        text: message
        sent: new Date()

      group.messages.push aMessage.id
      group.lastMessage = aMessage.id
      Q.all([aMessage.saveQ(), group.saveQ()]).then => [members, aMessage, group]
    .spread (members, mes, group)=>
      @findOne(
        { '_id' : group.id },
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

module.exports = mongoose.model('Group', Group)
