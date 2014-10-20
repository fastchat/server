var should = require('chai').should(),
    supertest = require('supertest'),
    api = supertest('http://localhost:3000');

var mongoose = require('mongoose');
var async = require('async');
var User = require('../../index').User;

var tokens = [];
var users = [];

describe('Devices', function() {

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
      function(cb) {
	///
	/// Add three users to seed our DB. We have to do it via the post request,
	/// because registering does a lot more than just create a DB record. Plus,
	/// this has already been tested, so we know it works.
	///
	api.post('/user')
	  .send({'username' : 'test1', 'password' : 'test'})
	  .end(function(err, res) {
	    users.push(res.body);
	    cb();
	  });
      },
      function(cb) {
	api.post('/login')
	  .send({'username' : 'test1', 'password' : 'test'})
	  .end(function(err, res) {
	    tokens.push( res.body['session-token'] );
	    cb();
	  });
      }
    ],
    // optional callback
    function(err, results){
      done();
    });
    
  }); // before


  it('should be empty when you first request a token', function(done) {
    api.get('/user/device')
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

  it('should return an error if you send nothing in the post request', function(done) {
    api.post('/user/device')
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

  it('should return an error if you send not ios or android', function(done) {
    api.post('/user/device')
      .set('session-token', tokens[0])
      .send({token: 'something', type:'windows_phone'})
      .expect(400)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	should.exist(res.body.error);
	done();
      });
  });

  it('should let you create an iOS device', function(done) {
    api.post('/user/device')
      .set('session-token', tokens[0])
      .send({token: 'somethingcool', type:'ios'})
      .expect(201)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	done();
      });
  });

  it('should let you create an Android device', function(done) {
    api.post('/user/device')
      .set('session-token', tokens[0])
      .send({token: 'awesometoken', type:'android'})
      .expect(201)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	done();
      });
  });


  it('should update your device if you sent in the same token', function(done) {
    api.post('/user/device')
      .set('session-token', tokens[0])
      .send({token: 'somethingcool', type:'ios'})
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	done();
      });
  });

  it('should show all your devices when you request them', function(done) {
    api.get('/user/device')
      .set('session-token', tokens[0])
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	res.body.should.have.length(2);
	done();
      });
  });

  after(function(done) {
    mongoose.disconnect();
    done();
  });

});
