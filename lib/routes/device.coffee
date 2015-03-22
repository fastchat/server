Device = require('../model/device')

getDevices = (req, reply)->
  Device.findQ(user: req.user._id)
  .then (devices)->
    res.status(200).json(devices)
  .fail(next)
  .done()

postDevice = (req, reply)->
  Device.createOrUpdate(req.user, req.body.token, req.body.type, req.headers['session-token'])
  .then (device)->
    console.log 'Device', device
    res.status(if device then 201 else 200).json(if device then device else {})
  .fail(next)
  .done()

module.exports = [
  {
    method: 'GET'
    path: '/user/device'
    handler: getDevices
  }
  {
    method: 'POST'
    path: '/user/device'
    handler: postDevice
  }
]
