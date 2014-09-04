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

describe('Socket.io', function() {

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
	    // Number 2
	    api.post('/user')
	      .send({'username' : 'test2', 'password' : 'test'})
	      .end(function(err, res) {
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
	api.post('/user/device')
	  .set('session-token', tokens[1])
	  .send({token: 'somethingcool', type:'ios'})
	  .expect(201)
	  .expect('Content-Type', /json/)
	  .end(function(err, res) {
	    should.not.exist(err);
	    should.exist(res.body);

	    api.post('/user/device')
	      .set('session-token', tokens[1])
	      .send({token: 'awesometoken', type:'android'})
	      .expect(201)
	      .expect('Content-Type', /json/)
	      .end(function(err, res) {
		should.not.exist(err);
		should.exist(res.body);
		cb();
	      });
	  });
      },
      function(callback) {
	///
	/// Add a group for both members
	///
	api.post('/group')
	  .set('session-token', tokens[0])
	  .send({'text' : 'This is a test message!', 'members': ['test2']})
	  .expect(201)
	  .expect('Content-Type', /json/)
	  .end(function(err, res) {
	    callback();
	  });
      },
      function(callback) {
	///
	/// Add a group for both members
	///
	api.get('/user')
	  .set('session-token', tokens[0])
	  .expect(200)
	  .expect('Content-Type', /json/)
	  .end(function(err, res) {
	    users.push(res.body.profile);

	    api.get('/user')
	      .set('session-token', tokens[1])
	      .expect(200)
	      .expect('Content-Type', /json/)
	      .end(function(err, res) {
		users.push(res.body.profile);
		callback();
	      });
	  });
      },
    ],
    // optional callback
    function(err, results){
      // Oh look, now we are done
      done();
    });

  }); // before

  it('should not let a user connect without a session token', function(done) {

    var client = io.connect(socketURL, options);

    client.on('connect', function(data) { });

    client.on('error', function(err) {
      should.exist(err);
      done();
    });
  });

  it('should not let a user connect with a false session token', function(done) {

    options.query = 'token=33';
    var client = io.connect(socketURL, options);

    client.on('connect', function(data) { });

    client.on('error', function(err) {
      should.exist(err);
      done();
    });
  });

  it('should let a user connect to the socket.io server with a proper token', function(done) {

    options.query = 'token=' + tokens[0];
    var client = io.connect(socketURL, options);

    client.on('connect', function(data) {
      client.disconnect();
      done();
    });
  });

  it('should send a message when the client has connected', function(done) {

    options.query = 'token=' + tokens[0];
    var client = io.connect(socketURL, options);

    client.on('connect', function(data) {
      should.not.exist(data);
    });

    client.on('connected', function(data) {
      should.exist(data);
      data.should.equal('FastChat');
      client.disconnect();
      done();
    });
  });


  it('should not send a typing message if nothing is sent', function(done) {

    options.query = 'token=' + tokens[0];
    var client1 = io.connect(socketURL, options);

    client1.on('connect', function(data) {
      should.not.exist(data);

      options.query = 'token=' + tokens[1];
      var client2 = io.connect(socketURL, options);

      client2.on('connect', function(data) {
	should.not.exist(data);
	///
	/// We are ready to go
	///
	client1.emit('typing', {}); // should not crash the server
	client1.disconnect();
	client2.disconnect();
	done();
      });
    });
  });

  it('should send typing=false if you do not specify anything', function(done) {

    options.query = 'token=' + tokens[0];
    var client1 = io.connect(socketURL, options);

    client1.on('connect', function(data) {
      should.not.exist(data);

      options.query = 'token=' + tokens[1];
      var client2 = io.connect(socketURL, options);

      client2.on('connect', function(data) {
	should.not.exist(data);

	client2.on('typing', function(typing) {
	  should.exist(typing);
	  typing.typing.should.equal(false);
	  typing.from.should.equal(users[0]._id);
	  client1.disconnect();
	  client2.disconnect();
	  done();
	});

	///
	/// We are ready to go
	///
	client1.emit('typing', { group: users[0].groups[0]._id });
      });
    });
  });

  it('should send typing=true if you specify true', function(done) {

    options.query = 'token=' + tokens[0];
    var client1 = io.connect(socketURL, options);

    client1.on('connect', function(data) {
      should.not.exist(data);

      options.query = 'token=' + tokens[1];
      var client2 = io.connect(socketURL, options);

      client2.on('connect', function(data) {
	should.not.exist(data);

	client2.on('typing', function(typing) {
	  should.exist(typing);
	  typing.typing.should.equal(true);
	  typing.from.should.equal(users[0]._id);
	  client1.disconnect();
	  client2.disconnect();
	  done();
	});

	///
	/// We are ready to go
	///
	client1.emit('typing', { group: users[0].groups[0]._id, typing: true });
      });
    });
  });

  it('should send typing=true if you specify a truethy value', function(done) {

    options.query = 'token=' + tokens[0];
    var client1 = io.connect(socketURL, options);

    client1.on('connect', function(data) {
      should.not.exist(data);

      options.query = 'token=' + tokens[1];
      var client2 = io.connect(socketURL, options);

      client2.on('connect', function(data) {
	should.not.exist(data);

	client2.on('typing', function(typing) {
	  should.exist(typing);
	  typing.typing.should.equal(true);
	  typing.from.should.equal(users[0]._id);
	  client1.disconnect();
	  client2.disconnect();
	  done();
	});

	///
	/// We are ready to go
	///
	client1.emit('typing', { group: users[0].groups[0]._id, typing: 'yes' });
      });
    });
  });

  it('should send a message', function(done) {

    var acknowledgement = null;

    Group.findOne({_id: users[0].groups[0]._id}, function(err, group) {
      should.not.exist(err);
      should.exist(group);
      group.messages.should.have.length(1);

      options.query = 'token=' + tokens[0];
      var client1 = io.connect(socketURL, options);

      client1.on('connect', function(data) {
	should.not.exist(data);

	options.query = 'token=' + tokens[1];
	var client2 = io.connect(socketURL, options);

	client2.on('connect', function(data) {
	  should.not.exist(data);

	  client2.on('message', function(message) {
	    should.exist(message);
	    message.text.should.equal('Test Message!');
	    message.from.should.equal(users[0]._id);
	    should.exist(message.sent);
	    should.exist(message.hasMedia);
	    message.hasMedia.should.equal(false);
	    ///
	    /// Validate the message was added to the group. Why the timeout?
	    /// Otherwise, we query the database *before* the message gets added
	    /// to it, so it's not associated yet. One second later, we're pretty
	    /// sure it is.
	    ///
	    setTimeout(function() {
	      Group.findOne({_id: users[0].groups[0]._id}, function(err2, group2) {
		should.not.exist(err2);
		should.exist(group2);
		group2.messages.should.have.length(2);

		Message.findOne({_id: message._id}, function(err3, aMes) {
		  should.not.exist(err3);
		  aMes._id.toString().should.equal(message._id.toString());
		  aMes.group.toString().should.equal(users[0].groups[0]._id.toString());
		  aMes.text.should.equal(message.text);
		  client1.disconnect();
		  client2.disconnect();
		  should.exist(acknowledgement);
		  done();
		});
	      });
	    }, 1000);
	  });

	  ///
	  /// We are ready to go
	  ///
	  client1.emit('message', {
	    group: users[0].groups[0]._id,
	    text: 'Test Message!'
	  }, function(ack) {
	    console.log('ACKNOWLEDGEMENT:', ack);
	    should.exist(ack);
	    acknowledgement = ack;
	  });
	});
      });

    });
  });

  it('should not send a message if the group is not included', function(done) {

    options.query = 'token=' + tokens[0];
    var client1 = io.connect(socketURL, options);

    client1.on('connect', function(data) {
      should.not.exist(data);

      options.query = 'token=' + tokens[1];
      var client2 = io.connect(socketURL, options);

      client2.on('connect', function(data) {
	should.not.exist(data);

	client2.on('message', function(message) {
	  should.fail('You should not ge this message!');
	});

	///
	/// We are ready to go
	///
	client1.emit('message', {
	  text: 'Test Message!'
	});

	setTimeout(function() {
	  client1.disconnect();
	  client2.disconnect();
	  done();
	}, 4500);

      });
    });
  });

  it('should not send a message if the text is not included', function(done) {

    options.query = 'token=' + tokens[0];
    var client1 = io.connect(socketURL, options);

    client1.on('connect', function(data) {
      should.not.exist(data);

      options.query = 'token=' + tokens[1];
      var client2 = io.connect(socketURL, options);

      client2.on('connect', function(data) {
	should.not.exist(data);

	client2.on('message', function(message) {
	  should.fail('You should not ge this message!');
	});

	///
	/// We are ready to go
	///
	client1.emit('message', {
	  group: users[0].groups[0]._id
	});

	setTimeout(function() {
	  client1.disconnect();
	  client2.disconnect();
	  done();
	}, 4500);

      });
    });
  });

  it('should not send a media message', function(done) {

    options.query = 'token=' + tokens[0];
    var client1 = io.connect(socketURL, options);

    client1.on('connect', function(data) {
      should.not.exist(data);

      options.query = 'token=' + tokens[1];
      var client2 = io.connect(socketURL, options);

      client2.on('connect', function(data) {
	should.not.exist(data);

	client2.on('message', function(message) {
	  should.exist(message);
	  message.text.should.equal('Test Message!');
	  message.from.should.equal(users[0]._id);
	  should.exist(message.sent);
	  should.exist(message.hasMedia);
	  message.hasMedia.should.equal(false);
	  client1.disconnect();
	  client2.disconnect();
	  done();
	});

	///
	/// We are ready to go
	///
	client1.emit('message', { 
	  group: users[0].groups[0]._id,
	  text: 'Test Message!'
	});
      });
    });
  });


  after(function(done) {
    mongoose.disconnect();
    done();
  });

});
