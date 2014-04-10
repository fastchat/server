var should = require('chai').should(),
    supertest = require('supertest'),
    api = supertest('http://localhost:3000');

var mongoose = require('mongoose');
var User = require('../model/user');
var token = null;
var createdUser = null;
var UNAUTHENTICATED_MESSAGE = 'You are not logged in!';

describe('Authentication', function() {

  before(function(done){
    mongoose.connect( 'mongodb://localhost/test' );
    var db = mongoose.connection;
    db.once('open', function callback() {
      User.remove({}, function(err) {
	done();
      });
    });
  });

  it('should fail to register a new user without the proper information', function(done) {
    api.post('/user')
    .send({})
    .expect(400)
    .expect('Content-Type', /json/)
    .end(function(err, res) {
      should.exist(res.body);
      should.exist(res.body.error);
      should.not.exist(err);
      res.body.error.should.contain('Username');
      res.body.error.should.contain('password');
      done();
    });
  });

  it('should allow a user to be registered with a username and password', function(done) {
    api.post('/user')
    .send({'username' : 'test1', 'password' : 'test'})
    .expect(201)
    .expect('Content-Type', /json/)
    .end(function(err, res) {
      should.exist(res.body);
      should.not.exist(err);
      should.exist(res.body.username);
      res.body.username.should.equal('test1');
      res.body.password.should.not.equal('test');
      createdUser = res.body;
      
      User.find(function(err, users) {
	should.not.exist(err);
	users.should.have.length(1);
	done();
      });
    });
  });

  it('should not allow you to login without a username and password', function(done) {
    api.post('/login')
    .send({})
    .expect(401)
    .expect('Content-Type', /json/)
    .end(function(err, res) {
      should.exist(res.body);
      should.exist(res.body.error);
      should.not.exist(err);
      res.body.error.should.contain('username');
      res.body.error.should.contain('password');
      done();
    });
  });

  it('should allow you to login with a username and password', function(done) {
    api.post('/login')
      .send({'username' : 'test1', 'password' : 'test'})
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.exist(res.body);
	should.not.exist(err);
	should.exist(res.body['session-token']);
	token = res.body['session-token'];
	done();
      });
  });

  it('should return a new  Session Token if you login again', function(done) {
    api.post('/login')
      .send({'username' : 'test1', 'password' : 'test'})
      .end(function(err, res) {
	token.should.not.equal(res.body['session-token']);
	done();
      });
  });

  it('should return the user profile', function(done) {
    api.get('/user')
      .set('session-token', token)
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.exist(res.body);
	should.exist(res.body.profile);
	createdUser.username.should.equal(res.body.profile.username);
	createdUser.password.should.equal(res.body.profile.password);
	createdUser._id.should.equal(res.body.profile._id);
	done();
      });
  });


  it('should not allow you to logout without a session token', function(done) {
    api.del('/logout')
      .expect(401)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.exist(res.body);
	should.not.exist(err);
	res.body.error.should.contain(UNAUTHENTICATED_MESSAGE);
	done();
      });
  });

  it('should log you out and remove your session token', function(done) {
    var arrayLength = -1;

    User.findOne({_id: createdUser._id}, function(err, user) {
      should.not.exist(err);
      arrayLength = user.accessToken.length;

      api.del('/logout')
	.set('session-token', token)
	.expect(200)
	.expect('Content-Type', /json/)
	.end(function(err, res) {
	  should.exist(res.body);
	  should.not.exist(err);

	  /// did we delete it?
	  User.findOne({_id: createdUser._id}, function(err, user) {
	    should.not.exist(err);

	    var newLength = user.accessToken.length;
	    newLength.should.below(arrayLength);
	    (newLength + 1).should.equal(arrayLength);
	    done();
	  });
	});
    });
  });

  it('should not let you login with your old session token', function(done) {
    api.del('/logout')
      .set('session-token', token)
      .expect(401)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	res.body.error.should.equal(UNAUTHENTICATED_MESSAGE);
	done();
      });
  });

 
  it('should give a 401 on profile request', function(done) {
    api.get('/user')
    .set('x-api-key', '123myapikey')
    .auth('incorrect', 'credentials')
    .expect(401, done)
  });

  it('should return a new  Session Token if you login for the last time', function(done) {
    api.post('/login')
      .send({'username' : 'test1', 'password' : 'test'})
      .end(function(err, res) {
	token.should.not.equal(res.body['session-token']);
	token = res.body['session-token'];
	done();
      });
  });

  it('logging out of ALL should remove all session tokens', function(done) {
    var arrayLength = -1;

    User.findOne({_id: createdUser._id}, function(err, user) {
      should.not.exist(err);
      arrayLength = user.accessToken.length;
      arrayLength.should.equal(2);

      api.del('/logout?all=true')
	.set('session-token', token)
	.expect(200)
	.expect('Content-Type', /json/)
	.end(function(err, res) {
	  should.exist(res.body);
	  should.not.exist(err);

	  /// did we delete it?
	  User.findOne({_id: createdUser._id}, function(err, user) {
	    should.not.exist(err);
	    user.accessToken.should.be.empty;
	    done();
	  });
	});
    });
  });

  after(function(done) {
    mongoose.disconnect();
    done();
  });

});
