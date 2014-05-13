var should = require('chai').should(),
    supertest = require('supertest'),
    api = supertest('http://localhost:3000');
var async = require('async');
var mongoose = require('mongoose');
var User = require('../index').User;
var Group = require('../index').Group;
var Message = require('../index').Message;
var GroupSetting = require('../index').GroupSetting;
var tokens = [];
var users = [];

var io = require('socket.io-client');
var socketURL = 'http://localhost:3000';
var options = {
  transports: ['websocket'],
  'force new connection': true,
};

describe('Messages', function() {

    before(function(done) {
    mongoose.connect( 'mongodb://localhost/test' );
    var db = mongoose.connection;

    async.series([
      function(callback) {
	///
	/// Remove all users
	///
	db.once('open', function() {
	  User.remove({}, function(err) {
	    callback();
	  });
	});
      },
      function(callback) {
	///
	/// Add three users to seed our DB. We have to do it via the post request,
	/// because registering does a lot more than just create a DB record. Plus,
	/// this has already been tested, so we know it works.
	///
	api.post('/user')
	  .send({'username' : 'test1', 'password' : 'test'})
	  .end(function(err, res) {
	    users.push(res.body);
	    // Number 2
	    api.post('/user')
	      .send({'username' : 'test2', 'password' : 'test'})
	      .end(function(err, res) {
		users.push(res.body);
		callback();
	      });
	  });
      },
      function(callback) {
	api.post('/login')
	  .send({'username' : 'test1', 'password' : 'test'})
	  .end(function(err, res) {
	    tokens.push( res.body['session-token'] );
	    //login second user
	    api.post('/login')
	      .send({'username' : 'test2', 'password' : 'test'})
	      .end(function(err, res) {
		tokens.push( res.body['session-token'] );
		callback();
	      });
	  });
      }
    ],
    // optional callback
    function(err, results){
      // Oh look, now we are done
      done();
    });
    
  }); // before

  it('should let a user connect to the socket.io server', function(done) {

    options.query = 'token=' + tokens[0];
    var client1 = io.connect(socketURL, options);

    client1.on('connect', function(data) {
//      console.log(data);
      done();
    });
  });



  after(function(done) {
    mongoose.disconnect();
    done();
  });

});
