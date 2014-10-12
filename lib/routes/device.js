var Q = require('q');
var User = require('../model/user');
var Device = require('../model/device');


exports.getDevices = function(req, res, next) {
  
  Device.findQ({'user': req.user._id})
    .then(function(devices) {
      res.status(200).json(devices);
    })
    .catch(next)
    .done()
};


exports.postDevice = function(req, res, next) {
  var user = req.user;
  var token = req.body.token;
  var type = req.body.type;
  
  Device.createOrUpdate(user, token, type, req.headers['session-token'])
    .then(function(device) {
      res.status(device ? 201 : 200).json(device ? device : {});
    })
    .catch(next)
    .done();
};
