mongoose = require('mongoose-q')()
Schema = mongoose.Schema
bcrypt = require('bcrypt')
SALT_WORK_FACTOR = 10
Device = require('./device')
Group = require('./group')
ObjectId = mongoose.Types.ObjectId
Q = require('q')
fs = require('fs')
uuid = require('uuid')
Boom = require('boom')

knox = require('knox').createClient
  key: process.env.AWS_KEY
  secret: process.env.AWS_SECRET
  bucket: 'com.fastchat.dev.avatars'

EXTENSION_LOOKUP =
  'image/jpeg': 'jpg'
  'image/png': 'png'
  'image/gif' : 'gif'

mimeTypes = ['image/jpeg', 'image/png', 'image/gif']


###
 Valid Username Regex
###
regex = /^[a-zA-Z0-9-_.]+$/

###
 * User Model
 * Stores all the information about the user. Users are required to have a username
 * that must be unique. The password is hashed and stored using bcrypt. The accessToken
 * is used to authenticate the user on API calls.
 *
 * Each users knows of it's groups and also knows of any pending invites.
###
User = new Schema
  username: {type: String, required: true, unique: true, lowercase: true}
  password: {type: String, required: true}
  accessToken: [{type: String, default: []}]
  groups: [{type: Schema.Types.ObjectId, ref: 'Group'}]
  leftGroups: [{type: Schema.Types.ObjectId, ref: 'Group', default: [] }]
  devices: [{type: Schema.Types.ObjectId, ref: 'Device', default: [] }]
  groupSettings: [{type: Schema.Types.ObjectId, ref: 'GroupSetting', default: []}]
  avatar: {type: String, default: null}

###
 * BCrypt Middleware to hash the password given before the user is saved.
 * This is never called explicitly.
###
User.pre 'save', (next)->
  return next unless @isModified 'password'

  bcrypt.genSalt SALT_WORK_FACTOR, (err, salt)=>
    return next(err) if err
    bcrypt.hash @password, salt, (err, hash)=>
      return next(err) if err
      @password = hash
      next()


###
 * Creates a new user from a username and password.
 * This will create the user and make a default group for them to chat
 * in (which they can rename or invite someone too), and then it will return
 * the user.
 *
 * @username The username for the user.
 * @password The password for the user.
 * @cb callback(Error, User)
###
User.statics =

  register: (username, password)->

    throw Boom.badRequest 'Username is required!' unless username
    throw Boom.badRequest 'Password is required!' unless password
    throw Boom.badRequest 'Invalid username! Only alphanumeric values are allowed, with -, _, and .' if username.search(regex) is -1

    newUser = new @ username: username, password: password
    newUser.saveQ().then -> newUser

  findByLowercaseUsername: (username)->
    @findOneQ(username: username.toLowerCase())
      .then (user)->
        throw new Error 'Incorrect username or password!' unless user
        user

User.methods =

  ###
   * Compares a given password with the user's password.
   * Uses bcrypt and hashes the given password.
   *
   * @candidatePassword The given password to compare
   * @cb The callback with the result. cb(error, isMatch)
  ###
  comparePassword: (candidatePassword, cb)->
    compare = Q.denodeify(bcrypt.compare)
    compare(candidatePassword, @password).then (matched)->
      throw new Error('Incorrect username or password') unless matched
      matched

  ###
   * Creates the session token for the user.
   * Utilizes the crypto library to generate the token, from the docs it:
   * 'Generates cryptographically strong pseudo-random data'
   * We then change that to a hex string for nice representation.
  ###
  generateRandomToken: ->
    require('crypto').randomBytes(48).toString('hex')

  ###
   * Pushes a message to each device this user controls.
   * We will want this to be 'smarter' in the future, but this is a good first
   * pass. Smarter implementations will understand which device the user used
   * last and will send the notification to that device first, wait some time,
   * then send a notification to the other devices.
   *
   * @message The message from the server. Should have 'text' property.
  ###
  push: (group, message, unread, contentAvailable)->
    Device.findQ(user: @id).then (devices)->
      device.send(group, message, unread, contentAvailable) for device in devices

  ###
   * A convenience method that will return if the user is in the group
   * requested.
   *
   * @group The group as a String or ObjectId that you want to see if the
   * user is in.
  ###
  hasGroup: (group)->
    return no unless group

    group = group.toString()
    groupId = group

    try
      groupId = new ObjectId group
    catch err
      return no

    return @groups.indexOfEquals groupId isnt -1

  logout: (all, token)->

    tokens = []
    if all
      tokens = tokens.concat @accessToken
      @accessToken.splice 0, @accessToken.length
    else
      index = @accessToken.indexOf token
      if index > -1
        @accessToken.splice index, 1
        tokens.push token

    Device.findQ({accessToken : {$in: tokens}}).then (devices)=>
      device.logout() for device in devices
      @saveQ()

  setAvatar: (name)->
    @avatar = name
    @saveQ()

  uploadAvatar: (fields, files)->

    console.log('GOT HERE!')
    throw new Error('No files were found in the upload!') unless files
    throw new Error('Avatar was not found in the upload!') unless files.avatar

    file = files.avatar[0]
    throw new Error 'Avatar was not found in the files, in first index!' unless file

    stream = fs.createReadStream file.path
    type = mimeTypes.indexOf(file.headers['content-type'])
    throw new Error('File is not a supported type!') if type is -1

    randomName = uuid.v4() + '.' + EXTENSION_LOOKUP[mimeTypes[type]]

    console.log('Uploading to S3', file)

    options =
      'Content-Type': file.headers['content-type']
      'Cache-Control': 'max-age=604800'
      'x-amz-acl': 'public-read'
      'Content-Length': file.size

    deferred = Q.defer()

    knox.putStream stream, randomName, options, (err, result)=>
      return deferred.reject err if err
      return deferred.resolve(@setAvatar(result.req.path.replace(/^.*[\\\/]/, '')))
    return deferred.promise

  getAvatar: ->
    throw Boom.notFound() unless @avatar

    deferred = Q.defer()
    data = ''

    knox.get(@avatar).on 'response', (res)->

      if res.statusCode < 200 or res.statusCode > 300
        deferred.reject new Error('There was an error fetching your image!')

      res.setEncoding('binary')
      res.on 'data', (chunk)->
        data += chunk

      res.on 'end', ->
        deferred.resolve(['image/jpeg', data])

      res.on 'error', deferred.reject

    .end()

    deferred.promise


module.exports = mongoose.model 'User', User
