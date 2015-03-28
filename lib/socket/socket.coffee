io = require('socket.io')
ObjectId = require('mongoose').Types.ObjectId
User = require('../model/user')
Message = require('../model/message')
Group = require('../model/group')
GroupSetting = require('../model/groupSetting')
async = require('async')
Q = require('q')

sockets = {}

exports.setup = (server)->
  io = io.listen(server.listener, origins: '*:*')
  io.set 'log level', 1

  #
  # Setup Socket IO
  #
  io.configure ->
    io.set 'authorization', (handshakeData, callback)->
      token = handshakeData.query.token
      return callback(new Error('You must have a session token!')) unless token

      User.findOneQ(accessToken: token)
        .then (user)->
          throw 'Error' unless user
          handshakeData.user = user
          callback( null, true )
        .fail(callback)
        .done()

  io.on 'connection', (socket)->
    socketUser = socket.handshake.user

    #
    # Store the socket for later so we can emit events to it.
    #
    sockets[socketUser._id] = socket

    #
    # Upon connecting, join every room that you should be in.
    #
    socketUser.groups.forEach (group)->
      socket.join group

    #
    # Default event to send back to the client to let them know they are all set
    #
    socket.emit 'connected', 'FastChat'

    ###
     An event to make communication more dynamic. The typing event is immediatly fired
     to other clients listening on the room to allow them know when someone is typing.
     Format:
     {
       group: '342342343',
       typing: true[false]
     }
    ###
    socket.on 'typing', (typing)->
      room = typing.group
      return unless socketUser.hasGroup(room)

      toSend =
        typing: if typing['typing'] then true else false
        from: socketUser._id
        group: room

      socket.broadcast.to(room).emit 'typing', toSend

    ###
     Called when a message is sent to a group. It will send it to all people in the group
     and then save it for later retreiving, and then send a push notification to those
     people who are not in the group.
     Format:
     {
       group: '342342343',
       text: 'This is a message!'
     }
    ###
    socket.on 'message', (message, fn)->
      room = message.group

      if not message.text
        fn(error: 'No Message Text') if fn
        return

      if !socketUser.hasGroup(room)
        fn(error: 'Not Found') if fn
        return

      try
        roomId = new ObjectId room
      catch err
        console.log 'Tried to make the room ID and failed! ', err
        return

      #
      # Make a new message and add it to the group
      #
      mes = new Message
        from: socketUser._id
        group: roomId
        text: message.text
        sent: new Date()
        hasMedia: no

      #
      # Got the message id, let's send it back to the client.
      #
      fn(_id: mes._id) if fn

      #
      # Broadcast the message to everyone in the group instantly
      #
      socket.broadcast.to(room).emit 'message', mes

      #
      # Save the object we have, and add it to the group
      #
      Group.findOneQ(_id: room).then (group)->
        throw 'Not Found' unless group

        group.messages.push mes
        group.lastMessage = mes.id
        Q.all([group.saveQ(), mes.saveQ()]).then -> [group, mes]
      .spread (group, mes)->
        #
        # Add a temporary property 'fromUser' with the actual user object.
        #
        mes.fromUser = socketUser

        #
        # Let's send some notifications to all people not in the room.
        #
        clients = io.sockets.clients room
        roomUsers = []; #all currently in the room
        clients.forEach (client)->
          roomUsers.push client.handshake.user

        User.findQ({groups: { $in : [room] } }).then (users)->
          [group, message, users, roomUsers]
      .spread (group, message, users, roomUsers)->
        #refactor this?
        usersNotInRoom = users.diff roomUsers, '_id'

        async.each usersNotInRoom, (user, callback)->

          GroupSetting.findQ(user: user.id).then (gses)->
            thisGs = GroupSetting.forGroup gses, roomId
            return callback() unless thisGs
            thisGs.missed()
            text = "#{mes.fromUser.username}@#{group.name}:#{mes.text}"
            GroupSetting.totalUnread(gses).then (unread)->
              console.log 'Sending push to: ', mes.fromUser.username, unread
              user.push group, text, unread, false
            callback();
        (err)->
          console.log 'Error Occured in sending push notifications: ', err if err
      .catch (err)->
        console.log 'Duh:', err


    socket.on 'disconnect', ->
      delete sockets[socketUser.id]

###
# This method sends a message (@see message.js) to the group
# from no one in particular. It will simply send it out to all members of the group.
# This is useful for system events, such as someone joining or leaving the group.
###
exports.messageToGroup = (userId, groupId, event, message)->
  userSocket = sockets[userId]
  userSocket.broadcast.to(groupId).emit event, message if userSocket

###
# Have the given user join the room. This is useful for if the user has been
# invited to a group and they are currently chatting with people live. We will
# add them to the group so they can start receiving messages without having
# to disconnect and reconnect
###
exports.joinGroup = (groupId, userId)->
  userSocket = sockets[userId]

  #If this is false, then they were not on. Oh well.
  if userSocket
    userSocket.join groupId
    return true
  false


exports.emitNewGroup = (userId, group)->
  userSocket = sockets[userId]

  if userSocket
    userSocket.emit 'new_group', group
    return true
   false;
