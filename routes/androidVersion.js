var ObjectId = require('mongoose').Types.ObjectId;
var AndroidVersion = require('../model/androidVersion');

/*
* Adds a new version as the latest for android.
*
* This function should be unnaccessible to the public in the prod environment.
*/
exports.postAndroidVersion = function(req, res) {
  var versionData = req.body.version;
  var secret = req.body.secret;
  if(secret!=="sisCalendar"){
    return res.send(401,{error:"Not Authorized"});
  }
  if(!versionData){
    return res.send(500,{error:"No version given"});
  }
  var androidVersion = new AndroidVersion({version:versionData});
  androidVersion.save(function(err, data){
    if(err){
      return res.send(500,{error:"Couldn't save android version"});
    }
    return res.send(200,data);
  });
};

/*
* Endpoint for the android app to know if it has the latest version.
* This will allow the android app to prompt for an update and automatically
* bring them to Dropbox and later on to the Play Store.
*/
exports.getLatestAndroidVersion = function(req,res){
  AndroidVersion.findOne({}, {}, { sort: { 'created' : -1 } }, function(err, version){
    if(err || !version){
      return res.send(500,{error:"Couldn't find any android versions"});
    }
    return res.send(200,{version:version.version});
  });
}
