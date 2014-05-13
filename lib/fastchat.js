// exports

exports.GroupController = require('./controllers/group');

///
/// Routes
///
exports.DeviceRoutes = require('./routes/device');
exports.GroupRoutes = require('./routes/group');
exports.MessageRoutes = require('./routes/message');
exports.UserRoutes = require('./routes/user');

///
/// Models
///
exports.Device = require('./model/device');
exports.Errors = require('./model/errors');
exports.Group = require('./model/group');
exports.GroupSetting = require('./model/groupSetting');
exports.Message = require('./model/message');
exports.User = require('./model/user');

///
/// Socket.io
///
exports.Socket = require('./socket/socket');
