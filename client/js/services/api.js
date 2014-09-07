fastchat.service('api', function ($http, $rootScope, $q) {

  //////////////////////////////////////////////////////
  ////////////////// Authentication  ///////////////////
  //////////////////////////////////////////////////////

  var setToken = function(token) {
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

  this.logout = function() {
    return $http.delete('/logout')
      .then(function(response) {
	setToken(null);
	self.token = null;
	$http.defaults.headers.common['session-token'] = null;
	return response;
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
    if (self.token && self.token !== 'undefined') {
      return true;
    } else {
      self.token = getToken();
      return (self.token && self.token !== 'undefined') ? true : false;
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

  self.currentUserProfile = self.currentUserProfile ? self.currentUserProfile : null;

  this.profile = function() {
    if (self.currentUserProfile) {
      $q(function(resolve, reject) {
	resolve(self.currentUserProfile);
      });
    }
    
    return $http.get('/user')
      .then(function(response) {
	self.currentUserProfile = response.data.profile;
	console.log('User: ', self.currentUserProfile);
	return self.currentUserProfile;
      });
  };

  ///
  /// Avatars
  ///
  this.profileImage = function(userId) {

    console.log('Profile Avatar for:', userId);

    if (!userId) {
      console.log('current user profike', self.currentUserProfile);
      userId = self.currentUserProfile._id;
    }

    return $q(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/user/' + userId + '/avatar');
      xhr.setRequestHeader('session-token', self.token);
      xhr.responseType = "arraybuffer";

      xhr.onload = function( e ) {
	// If it failed...
	console.log('Status:', this.status, userId);
	if (this.status < 200 || this.status >= 300) {
	  
	  return reject(new Error('Not Found!'));
	}

	// Obtain a blob: URL for the image data.
	var arrayBufferView = new Uint8Array( this.response );
	var blob = new Blob( [ arrayBufferView ], { type: "image/png" } );
	var urlCreator = window.URL || window.webkitURL;
	var imageUrl = urlCreator.createObjectURL( blob );
	console.log('URL: ' + imageUrl);
	return resolve(imageUrl);
      };
      xhr.send();
    });
  };

  this.uploadAvatar = function(avatar, user) {

    var formData = new FormData();
    formData.append('avatar', avatar);

    var request = new XMLHttpRequest();
    request.open('POST', '/user/' + this.currentUserProfile._id + '/avatar');
    request.setRequestHeader('session-token', self.token);
    request.onload = function(e) {
      console.log('Reply:', e);
    };

    request.send(formData);
  };

  ///
  /// Send Media
  ///
  this.sendMedia = function(group, message) {
    return $q(function(resolve, reject) {

      var formData = new FormData();
      formData.append('media', message.media);
      formData.append('text', message.text);

      var request = new XMLHttpRequest();
      request.open('POST', '/group/' + group._id + '/message');
      request.setRequestHeader('session-token', self.token);

      request.onload = function(e) {
	if (this.status < 200 || this.status >= 300) {
	  return reject(new Error('Error!'));
	}
	return resolve();
      };

      request.send(formData);
    });
  }

  this.getMedia = function(groupId, messageId) {

    return $q(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/group/' + groupId + '/message/' + messageId + '/media');
      xhr.setRequestHeader('session-token', self.token);
      xhr.responseType = "arraybuffer";

      xhr.onload = function( e ) {
	// If it failed...
	console.log('Status:', this.status);
	if (this.status < 200 || this.status >= 300) {
	  return reject(new Error('Not Found!'));
	}

	// Obtain a blob: URL for the image data.
	var arrayBufferView = new Uint8Array( this.response );
	var blob = new Blob( [ arrayBufferView ], { type: "image/png" } );
	var urlCreator = window.URL || window.webkitURL;
	var imageUrl = urlCreator.createObjectURL( blob );
	console.log('URL: ' + imageUrl);
	return resolve(imageUrl);
      };
      xhr.send();
    });
  };

  // Not Implemented
  this.whatIsNew = function() {
    return $q(function(resolve, reject) {
      resolve(false);
    });
  };


});
