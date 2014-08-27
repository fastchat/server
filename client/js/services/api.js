fastchat.service('api', function ($http, $rootScope, $q) {

  //////////////////////////////////////////////////////
  ////////////////// Authentication  ///////////////////
  //////////////////////////////////////////////////////

  var setToken = function(token) {
    console.log('Setting:', token);
    if( typeof(Storage) !== 'undefined') {
      localStorage.setItem("com.fastchat.token", token);
    }
    this.token = token;
  };

  var getToken = function() {
    if( typeof(Storage) !== 'undefined') {
      var token = localStorage.getItem("com.fastchat.token");
      if (token === 'null' || token === 'undefined') {
	token = null;
      }
      console.log('Retrieved Token from Local Storage: ' + token);
      $http.defaults.headers.common['session-token'] = token;
      return token;
    } else {
      return null;
    }
  };

  this.token = getToken();

  var self = this;

  this.login = function(username, password) {
    return $http.post('/login', {'username': username, 'password': password})
      .then(function (data, status, headers, config) {
	console.log('Data', data);
	var session = data.data['session-token'];
	$http.defaults.headers.common['session-token'] = session;
	setToken(session);
	return true;
      }, function(err) {
	console.log('err', err);
	return err;
      });
  };

  this.register = function(username, password) {
    return $http.post('/user', {'username': username, 'password': password})
      .then(function (data, status, headers, config) {
	console.log('Register: ', data);
      }, function(data, status, headers, config) {
	console.log('ERR', data);
      });
  };
  
  this.isLoggedIn = function() {
    console.log('IS LOGGD IN CALLED: ', this.token);
    if (this.token && this.token !== 'undefined') {
      console.log('This TOken?', this.token);
      return true;
    } else {
      this.token = getToken();
      return this.token && this.token !== 'undefined';
    }
  };


  //////////////////////////////////////////////////////
  //////////////////// API Requsts  ////////////////////
  ////////////////////////////////////////////////////// 
  this.groups = function() {
    console.log('Getting groups');
    return $http.get('/group')
      .then(function(response) {
	if (response.status == 200) {
	  return MakeGroups(response.data);
	}
	return response;
      });
  };

  this.messages = function(id, page) {
    console.log('Getting groups for id:', id, page);
    if (!page) page = 0;
    return $http.get('/group/' + id + '/message', {'page':page}).
      then(function(response) {
	if (response.status == 200) {
	  return MakeMessages(response.data);
	}
	return response;
      });
  };

  
  var currentUserProfile = null;
  this.profile = function() {
    if (currentUserProfile) {
      $q(function(resolve, reject) {
	resolve(currentUserProfile);
      });    }
    
    return $http.get('/user')
      .then(function(response) {
	currentUserProfile = response.data.profile;
	console.log('User: ', currentUserProfile);
	return currentUserProfile;
      });

  };


});
