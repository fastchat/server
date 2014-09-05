fastchat.controller('ChatController', ['$scope', '$routeParams', '$location', 'api', 'socket', 'notification', 'hotkeys', function ($scope, $routeParams, $location, api, socket, notification, hotkeys) {

  var ENTER_KEYCODE = 13;

  var currentGroup = $routeParams.group;
  $scope.glued = true;
  $scope.profile = null;
  $scope.currentGroup = null;
  $scope.groups = [];
  $scope.avatars = {};
  
  ///
  /// Really wanted this to just be in the group, but it's not really
  /// easy or good to modify it as a group property.
  ///
  $scope.messages = [];

  $scope.chat = function() {
    var text = $scope.messageText;
    if (text) {
      
      var message = new Message({
	from: $scope.profile._id,
	'text': text,
	sent: new Date(),
	group: $scope.currentGroup._id,
	hasMedia: false
      });
      socket.send(message);
      $scope.messages.unshift(message);
      $scope.messageText = '';
      $scope.currentGroup.lastMessage = message;
    }
    //send to socket io
    console.log('text?', text);
  };

  hotkeys.bindTo($scope)
    .add({
      combo: ['command+enter', 'ctrl+enter'],
      description: 'Quickly send a message.',
      allowIn: ['TEXTAREA'],
      callback: $scope.chat
    });


  var onMessage = function(data) {
    var message = new Message(data);
    console.log('GOT MESSAGE', message);
    if (message.group === $scope.currentGroup._id) {
      console.log('Current Group:', $scope.currentGroup);
      $scope.messages.unshift(message);
      /// Angular is watching our current group,
      /// but I guess not the properties in it, so
      /// we kindly tell it we updated something.
      $scope.$apply();
    }
    notification.display(message);
  };

  ///
  /// Unfortunetely, we have a lot of setup to do
  ///
  var init = function () {
    ///
    /// As this runs, init socket if it's not already
    ///
    socket.connect(api.token);
    socket.addListener('message', onMessage);

    console.log('Init');
    api.profile()
      .then(function(response) {
	$scope.profile = response;
      });

    api.groups().then(function(groups) {
      console.log('Groups!', groups);
      $scope.groups = groups
      if (groups.length - 1 >= $scope.currentGroup) {
	$scope.currentGroup = groups[$routeParams.group];
	
	///
	/// Get all users avatars
	///
	async.each($scope.currentGroup.members, function(member, callback) {
	  api.profileImage(member._id)
	    .then(function(url) {
	      console.log('Got avatar: ', url);
	      $scope.avatars[member._id] = url;
	      var img = $(".avatar");
	      img.src = url;
	      callback();
	    })
	    .catch(function(err) {
	      $scope.avatars[member._id] = '/img/default_avatar.png';
	      callback();
	    });
	}, function(err) {
	  console.log('Finished getting Avatars. Error? ', err);
	});
	
	///
	/// Now get the messages
	///
	api.messages($scope.currentGroup._id).then(function(messages) {
	  console.log('Messages', messages);
	  $scope.messages = messages;
	});

      } else {
	$location.path('/chat/0');
      }
    });
  };

  init();


  $scope.handleEnter = function(evt) {
    console.log('Evt:', evt);
    if (evt.keyCode == ENTER_KEYCODE && !(evt.shiftKey || evt.altKey)) {
      $scope.chat();
      evt.preventDefault();
    }
  }; 

}]);
