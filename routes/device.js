var User = require('../model/user');
var Device = require('../model/device');

exports.getDevices = function(req, res) {
  Device.find({'user': req.user._id}, function(err, devices) {
    if (err) {
      return res.send(500, {'error':'There was an error with your request!'});
    } else {
      return res.send(devices);
    }
  });
};


exports.postDevice = function(req, res) {

  var usr = req.user;
  var token = req.body.token;
  if (!token) {
    console.log('Didnt send Token: ' + token);
    return res.send(400, {'error' : 'You must specify a token to register a device!'});
  }

  var type = req.body.type;
  if (!type || (type !== 'ios' && type !== 'android')) {
    console.log('Bad type: ' + type);
    return res.send(400, {'error' : 'Type must be "ios" or "android"!'});
  }

  Device.find({'token' : token}, function(err, devices) {
    if (err || devices.length > 0) return res.json(200, {}); //assume it's already registered

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
  });
};
