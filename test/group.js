var should = require('chai').should(),
    supertest = require('supertest'),
    api = supertest('http://localhost:3000');
var async = require('async');

var mongoose = require('mongoose');
var User = require('../model/user')
var tokens = [];
var users = [];

describe('Groups', function() {
  
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
		// Number 3
		api.post('/user')
		  .send({'username' : 'test3', 'password' : 'test'})
		  .end(function(err, res) {
		    users.push(res.body);
		    callback();
		  });
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
		//login third user
		api.post('/login')
		  .send({'username' : 'test3', 'password' : 'test'})
		  .end(function(err, res) {
		    tokens.push( res.body['session-token'] );
		    callback();
		  });
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

  it('should be empty for a brand new user', function(done) {

    api.get('/group')
      .set('session-token', tokens[0])
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	res.body.should.be.empty;
	done();
      });
  });

  it('should not allow a user to create a group with no information', function(done) {
    api.post('/group')
    .set('session-token', tokens[0])
    .send({})
    .expect(400)
    .expect('Content-Type', /json/)
    .end(function(err, res) {
      should.not.exist(err);
      should.exist(res.body);
      should.exist(res.body.error);
      done();
    });
  });

  it('should not allow a user to create a group with no message', function(done) {

    var user1 = users[1];

    api.post('/group')
    .set('session-token', tokens[0])
    .send({'members' : [user1._id]})
    .expect(400)
    .expect('Content-Type', /json/)
    .end(function(err, res) {
      should.not.exist(err);
      should.exist(res.body);
      should.exist(res.body.error);
      done();
    });
  });

  it('should not allow a user to create a group with no members', function(done) {
    api.post('/group')
      .set('session-token', tokens[0])
      .send({'text' : 'This is a test message!'})
      .expect(400)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	should.exist(res.body.error);
	done();
      });
  });

  it('should not allow a group to be created if the only member invited is the caller', function(done) {
    var user0 = users[0];

    api.post('/group')
      .set('session-token', tokens[0])
      .send({'text' : 'This is a test message!', 'members' : [user0.username]})
      .expect(400)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	should.exist(res.body.error);
	console.log('error: ' + res.body.error);
	done();
     });
  });




  after(function(done) {
    mongoose.disconnect();
    done();
  });

});
