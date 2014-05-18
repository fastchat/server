var User = require('../model/user');
var Device = require('../model/device');

exports.getDevices = function(req, res, next) {
  Device.find({'user': req.user._id}, function(err, devices) {
    if (err) {
      return next(500);
    } else {
      return res.send(devices);
    }
  });
};


exports.postDevice = function(req, res, next) {

  var usr = req.user;
  var token = req.body.token;
  if (!token) {
    console.log('Didnt send Token: ' + token);
    return next('You must specify a token to register a device!');
  }

  var type = req.body.type;
  if (!type || (type !== 'ios' && type !== 'android')) {
    console.log('Bad type: ' + type);
    return next('Type must be "ios" or "android"!');
  }

  Device.find({'token' : token, 'user' : usr._id}, function(err, devices) {
    console.log('Devices Found with Token: ' + JSON.stringify(devices, null, 4));
    console.log('Devices Error: ' + err);
    if (err) return next(500);

    if (devices.length > 0) {
      
      devices.forEach(function(device) {
	//update the session-token associated with it.
	device.accessToken = req.headers['session-token'];
	device.active = true;
	device.loggedIn = true;
	device.save();
      });

      return res.json(200, {});
    }

    var device = new Device({'token': token,
			     'type': type,
			     'user': usr._id,
			     'accessToken': req.headers['session-token']
			    });
    device.save(function(err) {
      if (!err) {
	usr.devices.push(device);
	usr.save(function(err) {
	  if (err) {
	    return next(500);
	  } else {
	    return res.json(201, {});
	  }
	});
      } else {
	console.log('Error Saving Device: ' + JSON.stringify(err, null, 4));
	return next(500);
      }	
    });
  });
};
