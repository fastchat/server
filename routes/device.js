var User = require('../model/user');
var Device = require('../model/device');

exports.getDevices = function(req, res) {
  User.fromToken( req.headers['session-token'], function (usr) {
    if (usr) {
      Device.find({'user': usr._id}, function(err, devices) {
	if (err) {
	  return res.send(500, {'error':'There was an error with your request!'});
	} else {
	  return res.send(devices);
	}
      });
    } else {
      res.send(401, {'error': 'User was not found!'});
    }
  });
};

exports.postDevice = function(req, res) {

  var token = req.body.token;
  if (!token) {
    console.log('Didnt find token: ' + token);
    return res.send(400, {'error' : 'You must specify a token to register a device!'});
  }

  var type = req.body.type;
  if (!type || (type !== 'ios' && type !== 'android')) {
    console.log('Bad type: ' + type);
    return res.send(400, {'error' : 'Type must be "ios" or "android"!'});
  }

  Device.find({'token' : token}, function(err, devices) {
    if (err || devices) return res.json(200, {});
    /// This device has not yet been registered!

    User.fromToken( req.headers['session-token'], function (usr) {
      if (usr) {
	var device = new Device({'token': token,
				 'type': type,
				 'user': usr._id
				});
	device.save(function(err) {
	  if (!err) {
	    usr.devices.push(device);
	    usr.save(function(err) {
	      if (err) {
		return res.send(500, {'error':'There was an error saving the device!'});
	      } else {
		return res.json(201, {});
	      }
	    });
	  } else {
	    console.log('Error Saving Device: ' + JSON.stringify(err, null, 4));
	    return res.send(500, {'error':'There was an error saving the device!'});
	  }	
	});
      } else {
	res.send(401, {'error': 'User was not found!'});
      }
    });

  });
};
