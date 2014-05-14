BASE_URL = 'http://localhost';
BASE_PORT = '3000';
//BASE_URL = 'http://powerful-cliffs-9562.herokuapp.com';
//BASE_PORT = '80';

function url(env) {
  if (typeof(BASE_PORT) === 'undefined' ) {
    return BASE_URL;
  }
  return BASE_URL + ':' + BASE_PORT;
};


function API() {
  this.token = this.getToken();

  if (this.isLoggedIn()) {
    this.setup();
  }

  console.log('API TOKEN: ' + this.token);

};

API.prototype = {

  isLoggedIn : function() {
    return this.token;
  }, //isLoggedIn

  setup : function() {
    $.ajaxSetup({
      headers: { 'session-token': this.token }
    });
  }, //setup
  
  // cb(err, success)
  login: function(username, pass, cb) {    
    var that = this;
    $.post( url()+ '/login', {'username': username, 'password': pass}, function( response ) {
      var token = response['session-token'];
      that.setToken(token);
      that.setup();
      return cb(null, true);
    }).fail(function(err) {
      cb(err, false);
    });
  }, //login

  //cb(err, success)
  logout: function(cb) {
    if (this.isLoggedIn()) {
      var that = this;
      $.ajax({
	url: url() + '/logout',
	type: 'DELETE',
	success: function(response) {
	  console.log('Delete Resonse: ' + JSON.stringify(response, null, 4));	
	  that.setToken(null);
	  that.token = null;
	  that.setup();
	  cb(null, true);
	}
      });
    }
  }, //logou

//"user": "test@gmail.com"
  // cb(err, success)
  register: function(username, pass, cb) {    
    $.post( url()+ '/user', {'username': username, 'password': pass}, function( response ) {
      return cb(null, true);
    }).fail(function(err) {
      console.log('ERR: ' + JSON.stringify(err, null, 4));
      cb(err, false);
    });

  }, //register

  // cb(err, groups)
  groups: function(cb) {
    
    console.log('Getting groups');

    if (this.isLoggedIn()) {
      console.log('Getting groups 2');
      $.get(url() + '/group', function( response ) {
	console.log('Groups: ' + JSON.stringify(response, null, 4));  
	cb(null, response);
      }).fail(function(err) {
	console.log('Error: ' + JSON.stringify(err, null, 4));
	cb(err);
      });

    } else {
      cb('You must be logged in!');
    }

  }, //group

  //cb(err, messages)
  messages: function(groupId, page, cb) {
    
    if (this.isLoggedIn()) {
      $.get(url() + '/group/' + groupId + '/message', {'page':page}, function( response ) {
	console.log('Messages: ' + JSON.stringify(response, null, 4));
	cb(null, response);
      }).fail(function(err) {
	console.log('Error: ' + JSON.stringify(err, null, 4));
	cb(err);
      });

    } else {
      cb('You must be logged in!');
    }
  },

  // cb(err, group)
  newGroup: function(name, text, members, cb) {
    
    var options = {};
    if (name) options['name'] = name;
    options.members = members;
    options.text = text;

    if (this.isLoggedIn()) {
      $.post(url() + '/group', options , function( response ) {
	cb(null, response);
      }).fail(function(err) {
	cb(err);
      });
    } else {
      cb('You Must be logged in!');
    }
  },

  // cb(err, success);
  invite: function(username, groupId, cb) {

    if (groupId === null || typeof groupId === 'undefined' || typeof groupId !== 'string') {
      return cb('You must specify the Group ID!');
    }

    if (this.isLoggedIn()) {
      $.ajax({
	url: url() + '/group/' + groupId + '/invite',
	type: 'PUT',
	data: {'invitees':[username]},
	success: function(response) {
	  console.log('Invite Resonse: ' + JSON.stringify(response, null, 4));	
	  cb(null, response);
	}
      });
    } else {
      return cb('You must be logged in!');
    }
  },

  // cb(err, profile) //with invites!
  profile: function(cb) {
    
    console.log('Getting Profile');
    if (this.isLoggedIn()) {
      console.log('Getting Profile 2');
      $.get(url() + '/user', function( response ) {
	console.log('Profile: ' + JSON.stringify(response, null, 4));
	cb(null, response.profile);
      }).fail(function(err) {
	console.log('Error: ' + JSON.stringify(err, null, 4));
	cb(err);
      });

    } else {
      cb('You must be logged in!');
    }
  }, //group

  profileImage: function(userId, cb) {
    console.log('Getting Profile Image');
    if (this.isLoggedIn()) {
      console.log('Getting Profile Image 2');
      $.get(url() + '/user/' + userId + '/avatar', function( response ) {
	cb(null, response);
      }).fail(function(err) {
	console.log('Error: ' + JSON.stringify(err, null, 4));
	cb(err);
      });

    } else {
      cb('You must be logged in!');
    }
  },

  // cb(err, success)
  acceptInvite: function(inviteNumber, cb) {
    
    $.post( url()+ '/user/accept', {'invite':inviteNumber}, function( response ) {
      console.log('Response: ' + JSON.stringify(response, null, 4));
      if (typeof response.error === 'undefined') {
	cb(null, true);
      } else {
	cb(response, false)
      }
    });
  },

  setToken : function(token) {
    if( typeof(Storage) !== 'undefined') {
      localStorage.setItem("com.fastchat.token", token);
    }
    this.token = token;
  },

  getToken: function() {
    if( typeof(Storage) !== 'undefined') {
      var token = localStorage.getItem("com.fastchat.token");
      if (token === 'null') {
	token = null;
      }
      console.log('Retrieved Token from Local Storage: ' + token);
      return token;
    } else {
      return null;
    }
  }, // getToken
  
};

API = new API();
