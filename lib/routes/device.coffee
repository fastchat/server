Device = require('../model/device')

exports.getDevices = (req, res, next)->

  Device.findQ(user: req.user._id)
    .then (devices)->
      res.status(200).json(devices)
    .fail(next)
    .done()

exports.postDevice = (req, res, next)->
  Device.createOrUpdate(req.user, req.body.token, req.body.type, req.headers['session-token'])
    .then (device)->
      res.status(if device then 201 else 200).json(if device then device else {})
    .fail(next)
    .done()