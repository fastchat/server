fastchat.controller('ChatController', ['$scope', '$routeParams', '$location', 'api', 'socket', 'notification', 'hotkeys', function ($scope, $routeParams, $location, api, socket, notification, hotkeys) {

  var currentGroup = $routeParams.group;
  $scope.glued = true;
  $scope.profile = null;
  $scope.currentGroup = null;
  $scope.groups = [];

/*
  console.log('Window? ', $(window));
  $(window).on('blur', function() {
    console.log('Blurred');
  }).on("focus", function() {
    console.log('back');
  });
*/
  
  ///
  /// Really wanted this to just be in the group, but it's not really
  /// easy or good to modify it as a group property.
  ///
  $scope.messages = [];

  $scope.chat = function() {
    var text = $scope.messageText;
    if (text) {
      
      var message = {
	from: $scope.profile._id,
	'text': text,
	sent: new Date(),
	group: $scope.currentGroup._id,
	hasMedia: false
      }
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

  var scrollToBottom = function() {
//    var currentHeight = $('#chatbox')[0].scrollHeight;
//    $('#chatbox').scrollTop(currentHeight);
  };


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
	/// Now get the messages
	///
	api.messages($scope.currentGroup._id).then(function(messages) {
	  console.log('Messages', messages);
	  $scope.messages = messages;
	  scrollToBottom();
	});

      } else {
	$location.path('/chat/0');
      }
    });
  };

  init();

}]);
