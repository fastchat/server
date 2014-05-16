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
var theGroup = null;
var mediaMessage = null;

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
      },
      function(cb) {
	api.post('/group')
	  .set('session-token', tokens[0])
	  .send({ 'text' : 'First', 'members': [ users[1].username ] })
	  .end(function(err, res) {
	    theGroup = res.body;
	    cb();
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

  it('should let a user upload an image', function(done) {

    var text = 'Example Text';
    var req = api.post('/group/' + theGroup._id + '/message');

    req.set('session-token', tokens[0])
    req.field('text', text);
    req.attach('media', 'test/test_image.png');
    req.end(function(err, res) {

      should.not.exist(err);
      should.exist(res.body);
      res.body.group.should.equal(theGroup._id);
      res.body.text.should.equal(text);
      res.body.hasMedia.should.equal(true);
      res.body.media_size.should.equal(7762);
      should.exist(res.body.media);
      res.body.mediaHeader[0].should.equal('image/png');
      mediaMessage = res.body;
      done();
    });
  });


  it('should let a user download an image', function(done) {

    api.get('/group/' + theGroup._id + '/message/' + mediaMessage._id + '/media')
      .set('session-token', tokens[0])
      .expect(200)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	done();
      });
  });

  after(function(done) {
    mongoose.disconnect();
    done();
  });

});
