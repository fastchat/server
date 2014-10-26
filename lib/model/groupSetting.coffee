mongoose = require('mongoose-q')()
Schema = mongoose.Schema
Q = require('q')

GroupSetting = new Schema
  user: {type: Schema.Types.ObjectId, ref: 'User'}
  group: {type: Schema.Types.ObjectId, ref: 'Group'}
  lastRead: {type: Schema.Types.ObjectId, ref: 'Message'}
  notifications: {type: Boolean, default: true}
  unread: {type: Number, default: 0}

calculateTotal = (gses)->
  gses.reduce( ((a, b)-> (a + b.unread)), 0)

GroupSetting.methods =

  read: ->
    @unread = 0
    @saveQ()


GroupSetting.statics =

  totalUnread: ->
    return Q(0) if arguments.length is 0
    arg = arguments[0]

    if arg instanceof require('./user')
      return @findQ(user: arg._id).then (gses)->
        calculateTotal(gses)

    return Q(calculateTotal(arg)) if Array.isArray(arg)


    Q(0)

  forGroup: (gses, groupId)->
    for gs in gses
      return gs if gs.group.equals groupId
    return null

module.exports = mongoose.model('GroupSetting', GroupSetting)
