mongoose = require('mongoose-q')()
Schema = mongoose.Schema
apn = require('apn')
gcm = require('node-gcm')
Boom = require('boom')
IOS_DEFAULT_SOUND = "ping.aiff"
apnConnection = new apn.Connection production: true
gcm = new gcm.Sender 'AIzaSyCmtVuvS3OlV801Mlq8IJDXOnsOXA502xA'

###
 * Holds the information about a device. This is used to be able to run smart
 * notifications. We can send notifications to the "last active device" and
 * then wait to send to the rest.
 *
 * type Should be either 'ios' or 'android'. Used to send notifications to the
 * correct gateways. More can be added later.
###
DeviceSchema = new Schema
  user: {type: Schema.Types.ObjectId, ref: 'User'}
  accessToken: {type: String, default: ''}
  loggedIn: {type: Boolean, default: true}
  active: {type: Boolean, default: true}
  token: String
  type: String
  lastActiveDate: Date
  failedAttempts: Number

###
 * Sends a string to the device.
 * Sets some nice defaults, and takes care of sending to APN or GCM.
 *
 * @message A string to send to the user in a notification.
###
DeviceSchema.methods =

  send: (group, message, badge, contentAvailable)->
    return if not @active or not @loggedIn

    if @type is 'android'
      @sendAndroid group, message, badge
    else if @type is 'ios'
      @sendIOS group, message, badge, contentAvailable

  sendAndroid: (group, message, badge, contentAvailable)->
    data = {}
    data.group = group._id if group
    data.text = message if message
    data.alert = badge if badge
    data.sound = IOS_DEFAULT_SOUND

    message = new gcm.Message data: data

    registrationIds = []
    registrationIds.push @token

    console.log 'Android Message:', message

    gcm.send message, registrationIds, 4, (err, result)->
      console.log 'GCM: ', result, ' Err? ', err

  sendIOS: (group, message, badge, contentAvailable)->
    badge = 0 if not badge

    device = null
    try
      device = new apn.Device @token
    catch err
      console.log 'Error Forming Device for APN!', err
      return

    note = new apn.Notification()
    note.expiry = Math.floor(Date.now() / 1000) + 3600 #Expires 1 hour from now.
    note.badge = badge if badge or badge is 0
    note.alert = message if message
    note.payload = group: group._id if group

    if contentAvailable
      note.setContentAvailable yes
    else
      note.sound = IOS_DEFAULT_SOUND

    console.log 'FIRING AWAY: ', note, ' TO: ', @token

    apnConnection.pushNotification note, device

  logout: ->
    @loggedIn = no
    @saveQ()


DeviceSchema.statics =

  createOrUpdate: (user, token, type, sessionToken)->
    throw Boom.badRequest 'You must specify a token to register a device!' if not token
    if not type or (type isnt 'ios' and type isnt 'android')
      throw Boom.badRequest 'Type must be "ios" or "android"!'

    self.findQ(token: token, user: user._id)
      .then (devices)->
        console.log 'Devices Found with Token: ', devices

        if devices and devices.length > 0
          devices.forEach (device)->
            #update the session-token associated with it.
            device.accessToken = sessionToken
            device.active = yes
            device.loggedIn = yes
            device.saveQ()
          throw 'done'
      .then ->
        device = new self(token: token
          type: type
          user: user._id
          accessToken: sessionToken
        )
        device.saveQ().then -> device
      .then (device)->
        user.devices.push device
        user.saveQ().then -> device
      .catch (err)->
        throw err unless err is 'done'
      .done()

module.exports = mongoose.model('Device', DeviceSchema)