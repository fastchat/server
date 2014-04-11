var should = require('chai').should(),
    supertest = require('supertest'),
    api = supertest('http://localhost:3000');
var async = require('async');

var mongoose = require('mongoose');
var User = require('../model/user');
var Group = require('../model/group');
var GroupSetting = require('../model/groupSetting');
var tokens = [];
var users = [];
var group = null;

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

  it('should not allow a user to create a group without an array', function(done) {
    api.post('/group')
      .set('session-token', tokens[0])
      .send({'text' : 'This is a test message!', 'members': {'test': 'test'}})
      .expect(400)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	should.exist(res.body.error);
	done();
      });
  });

  it('should let a user to create a group with the proper info', function(done) {

    var user1 = users[1];

    api.post('/group')
      .set('session-token', tokens[0])
      .send({'text' : 'This is a test message!', 'members': [user1.username]})
      .expect(201)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);

	var created = res.body;

	should.not.exist(created.name);
	created.members.should.have.length(2);
	created.leftMembers.should.be.empty;
	should.exist(created._id);
	created.messages.should.have.length(1);

	created.members.should.include(users[0]._id);
	created.members.should.include(users[1]._id);


	group = created;
	///
	/// Verify Group Settings
	///
	GroupSetting.findOne({'user': users[0]._id}, function(err, gs) {
	  should.exist(gs);
	  should.not.exist(err);
	  gs.unread.should.equal(0);
	  gs.group.toString().should.equal(created._id);

	  GroupSetting.findOne({'user': users[1]._id}, function(err2, gs2) {
	    should.exist(gs2);
	    should.not.exist(err2);
	    gs2.unread.should.equal(0);
	    gs2.group.toString().should.equal(created._id);
	    
	    done();	    
	  });
	});

      });
  });

  it('should not allow a user not in the group to change the name', function(done) {
    api.put('/group/' + group._id + '/settings')
      .set('session-token', tokens[2])
      .send({'name': 'New Group Name!'})
      .expect(404)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	should.exist(res.body.error);
	done();
      });
  });

  it('should not let a user change a group name with a bad id', function(done) {

    var badId = group._id.toString() + '111111';

    api.put('/group/' + badId + '/settings')
      .set('session-token', tokens[0])
      .send({'name': 'New Group Name!'})
      .expect(404)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	should.exist(res.body.error);
	done();
      });
  });

  it('should not let a user change a group name with a valid, but not found, id', function(done) {

    var anID = group._id;
    anID = anID.substr(0, anID.length - 4);
    anID = anID + '9999';

    api.put('/group/' + anID + '/settings')
      .set('session-token', tokens[0])
      .send({'name': 'New Group Name!'})
      .expect(404)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	should.exist(res.body.error);
	done();
      });
  });

  it('should let a user in the group change the group name', function(done) {

    api.put('/group/' + group._id + '/settings')
      .set('session-token', tokens[0])
      .send({'name': 'New Group Name!'})
      .expect(200)
      .expect('Content-Type', /json/)
      .end(function(err, res) {
	should.not.exist(err);
	should.exist(res.body);
	should.not.exist(res.body.error);
	
	Group.findOne({_id: group._id}, function(err, group) {
	  should.not.exist(err);
	  should.exist(group);
	  group.name.should.equal('New Group Name!');
	  done();
	});
      });
  });


  after(function(done) {
    mongoose.disconnect();
    done();
  });

});
