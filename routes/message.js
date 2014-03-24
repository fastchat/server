var User = require('../model/user');
var Group = require('../model/group');

exports.getMessages = function(req, res) {
  var groupID = req.params.id;
  User.findOne( {'accessToken': req.headers['session-token'] }, function(err, usr) {

    console.log('FOUND USER: ' + JSON.stringify(usr, null, 4));
    
    Group.findOne( { '_id': groupID, 'members' : usr._id })
      .populate('messages')
      .exec(function (err, group) {

	console.log('Grouppppp: ' + JSON.stringify(group, null, 4));

	if (err) return res.send(404, {error: 'Group not found!'});

	res.send(group.messages);
      });
  });
};




