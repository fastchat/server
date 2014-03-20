//BASE_URL = 'http://localhost';
BASE_URL = 'http://powerful-cliffs-9562.herokuapp.com';
//BASE_PORT = '3000';
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
    return chat.token !== null && typeof chat.token !== 'undefined';
  },
  
  // cb(err, success)
  login: function(email, pass, cb) {
    
    $.post( url()+ '/login', {'email':email, 'password':pass}, function( response ) {
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

  saveToken : function() {
    if( typeof(Storage) !== 'undefined') {
      localStorage.setItem("com.fastchat.token", chat.token);
    }
  },

  getToken: function() {
    if( typeof(Storage) !== 'undefined') {
      chat.token = localStorage.getItem("com.fastchat.token");
      console.log('Retrieved Token from Local Storage: ' + chat.token);
    }
  },
  
};

function showLogIn() {
  console.log('Log in...');
  
  $('#login_form').show('slow');
};



function showChats() {
  
  //loads the UI for chats.
  
  $('#login_form').hide();
  chat.groups();
};


chat = new FastChat(null);
