var User = require('../model/user');
var Group = require('../model/group');

exports.getMessages = function(req, res) {
  var groupID = req.params.id;
  User.fromToken( req.headers['session-token'], function (usr) {
    Group.find( { '_id': groupID, 'members' : usr._id })
      .populate('messages')
      .exec(function (err, groups) {
	if (err || groups.length == 0) return res.send(401, {error: err});

	var group = groups[0];
	console.log('Group? ' + JSON.stringify(group, null, 4));
	res.send(group.messages);
      });
  });    
};




