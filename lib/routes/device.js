var Device = require('../model/device');

exports.getDevices = function(req, res, next) {
  
  Device.findQ({'user': req.user._id})
    .then(function(devices) {
      res.status(200).json(devices);
    })
    .fail(next)
    .done()
};


exports.postDevice = function(req, res, next) {
  
  Device.createOrUpdate(req.user, req.body.token, req.body.type, req.headers['session-token'])
    .then(function(device) {
      res.status(device ? 201 : 200).json(device ? device : {});
    })
    .fail(next)
    .done();
};
