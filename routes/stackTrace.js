var ObjectId = require('mongoose').Types.ObjectId;
var StackTrace = require('../model/stackTrace');
var AndroidVersion = require('../model/androidVersion');

/*
* The android app has the ability to send stack traces when it crashes.
* This is the endpoint to which it sends those stack traces.
*
* NO user data is sent with the stack trace!
*/
exports.postStackTrace = function(req, res) {
  var text = req.body.stacktrace;
  var versionData = req.body.package_version;
  if(!text || !versionData){
    return res.send(500,{error:"Error retrieving post data"});
  }
  AndroidVersion.findOne({version:versionData},function(err,androidVersion){
    if(err || !androidVersion){
      return res.send(500,{error:"No record of that android version"});
    }
    var stackTrace = new StackTrace({androidVersion:androidVersion,trace:text});
    stackTrace.save(function(err,doc){
      if(err){
        return res.send(500,{error:"Couldn't save stack Trace"});
      }
      return res.send(200,doc);
    });
  });
};

/*
* Retrieve stack traces for a given android version.
* Should become inaccessible to the public when going to production.
*/
exports.getStackTraces = function(req,res){

  var androidVersion = req.params.version;
  console.log(androidVersion);
  AndroidVersion.findOne({version:androidVersion},function(err,versionObject){
    if(err || !versionObject){
      return res.send(500,{error:"Couldn't find android version"});
    }
    StackTrace.find({androidVersion:versionObject},function(err,traces){
      if(err || traces.length==0){
        return res.send(500,{error:"Couldn't find any stackTraces"});
      }
      return res.send(200,traces);
    });
  });
}
