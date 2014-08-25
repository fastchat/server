angular.module('fastchat')
  .service('apiService', ['$http', function ($http) {

    var token = this.getToken();

    this.login = function(username, password) {
      return $http.post('/login', {'username': username, 'password': password})
	.then(function (response) {
	  var session = response['session-token'];
	  $http.defaults.headers.common['session-token'] = session;
	  this.setToken(session);
	  return response;
        });
    };

    var setToken = function(token) {
      if( typeof(Storage) !== 'undefined') {
	localStorage.setItem("com.fastchat.token", token);
      }
      this.token = token;
    };

    var getToken = function() {
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
    };



  }]);
