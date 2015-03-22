User = require '../model/user'
ObjectId = require('mongoose-q')().Types.ObjectId
multiparty = require 'multiparty'
Boom = require 'boom'

# POST /login
# This is an alternative implementation that uses a custom callback to
# acheive the same functionality.
login = (req, reply)->
  console.log 'Logging in user'

  {username, password} = req.payload

  User.findByLowercaseUsername(username).then (user)->
    console.log 'Strategy Start 1'
    [user, user.comparePassword(password)]
  .spread (user, matched)->
    token = user.generateRandomToken()
    user.accessToken.push token
    [token, user.saveQ()]
  .spread (token)->
    reply(access_token: token)
  .fail (err)->
    reply(err)
  .done()

# POST /user
register = (req, reply)->
  User.register(req.payload)
  .then (user)->
    reply(user).code(201)
  .fail(next)
  .done()


# GET /user
profile = (req, reply)->
  User.findOne(_id: req.user.id)
  .populate('groups', 'name')
  .populate('leftGroups', 'name')
  .populate('groupSettings')
  .execQ()
  .then (user)->
    res.json profile: user
  .fail(next)
  .done()


logout = (req, reply)->
  {user, token} = req.auth.credentials
  user.logout(token, req.query.all is 'true')
  .then ->
    reply()
  .fail(next)
  .done()


uploadAvatar = (req, reply)->
  {user} = req.auth.credentials
  form = new multiparty.Form()

  form.parse req, (err, fields, files)->
    return reply(err) if err

    user.uploadAvatar(files)
    .then ->
      reply({})
    .fail(reply)
    .done()


getAvatar = (req, reply)->
  idParam = req.params.id
  userId = new ObjectId(idParam)

  User.findOneQ(_id: userId)
  .then (user)->
    throw Boom.notFound() unless user
    user.getAvatar()
  .spread (meta, data)->
    reply(data).type(meta)
  .fail(reply)
  .done()


module.exports = [
  {
    method: 'POST'
    path: '/login'
    config:
      handler: login
      auth: null
  }
  {
    method: 'POST'
    path: '/user'
    config:
      handler: register
      auth: null
  }
  {
    method: 'GET'
    path: '/user'
    handler: register
  }
  {
    method: 'DELETE'
    path: '/logout'
    handler: logout
  }
  {
    method: 'POST'
    path: '/user/{id}/avatar'
    handler: uploadAvatar
  }
  {
    method: 'GET'
    path: '/user/{id}/avatar'
    handler: getAvatar
  }
]
