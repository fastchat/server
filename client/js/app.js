BASE_URL = 'http://localhost';
//BASE_URL = 'http://powerful-cliffs-9562.herokuapp.com';
BASE_PORT = '3000';
//BASE_PORT = '80';

function url(env) {
  if (typeof(BASE_PORT) === 'undefined' ) {
    return BASE_URL;
  }
  return BASE_URL + ':' + BASE_PORT;
};

function FastChat(token) {
  this.token = token;
};

FastChat.prototype = {

  isLoggedIn : function() {

    if (chat.token === null || typeof chat.token === 'undefined') {
      this.getToken();
      $.ajaxSetup({
	headers: { 'session-token': chat.token }
      });
    }

    console.log('Session Token is: ' + chat.token);
    console.log('Token: ' + typeof(chat.token));
    return chat.token;

//    return (chat.token !== null) && typeof(chat.token) !== 'undefined' && typeof(chat.token) === 'string';
  },
  
  // cb(err, success)
  login: function(username, pass, cb) {
    
    $.post( url()+ '/login', {'username': username, 'password': pass}, function( response ) {
      var token = response['session-token'];
      if (typeof token !== 'undefined') {
	chat.token = token;
	chat.saveToken();
	$.ajaxSetup({
	  headers: { 'session-token': token }
	});
	console.log('Logged in, token is: ' + token);
	return cb(null, true);
      } else {
	console.log('Failed to Login! ' + JSON.stringify(response, null, 4));
	return cb(response, false);
      }
    });

  }, //login

  //cb(err, success)
  logout: function(cb) {

    if (this.isLoggedIn()) {
      $.ajax({
	url: url() + '/logout',
	type: 'DELETE',
	success: function(response) {
	  console.log('Delete Resonse: ' + JSON.stringify(response, null, 4));	
	  cb(null, true);
	}
      });
    }
  },

//"user": "test@gmail.com"
  // cb(err, success)
  register: function(username, pass, cb) {    
    $.post( url()+ '/register', {'username': username, 'password': pass}, function( response ) {
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
      var jqxhr = $.get(url() + '/group', function( response ) {
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

  // cb(err, group)
  newGroup: function(name, cb) {
    
    if (this.isLoggedIn()) {
      $.post(url() + '/group', {'name': name} , function( response ) {
	cb(null, response);
      });
    } else {
      cb('You Must be logged in!');
    }
  },

  // cb(err, success);
  invite: function(email, groupId, cb) {

    if (groupId === null || typeof groupId === 'undefined' || typeof groupId !== 'string') {
      return cb('You must specify the Group ID!');
    }

    if (this.isLoggedIn()) {
      $.ajax({
	url: url() + '/group/' + groupId + '/invite',
	type: 'PUT',
	data: {'invitees':[email]},
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
      $.get(url() + '/profile', function( response ) {
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

  saveToken : function() {
    if( typeof(Storage) !== 'undefined') {
      localStorage.setItem("com.fastchat.token", chat.token);
    }
  },

  getToken: function() {
    if( typeof(Storage) !== 'undefined') {
      chat.token = localStorage.getItem("com.fastchat.token");
      if (chat.token === 'null') {
	chat.token = null;
      }
      console.log('Retrieved Token from Local Storage: ' + chat.token);
    }
  },
  
};



function showChats() {
  
  //loads the UI for chats.
  
  $('#login_form').hide();
  chat.groups();
};


chat = new FastChat(null);
