fastchat.controller('ChatController', ['$scope', '$routeParams', '$location', '$sce', 'api', 'socket', 'notification', 'hotkeys', function ($scope, $routeParams, $location, $sce, api, socket, notification, hotkeys) {

  var currentGroup = $routeParams.group;
  $scope.glued = true;
  $scope.profile = null;
  $scope.currentGroup = null;
  $scope.groups = [];
  $scope.avatars = {};

  ///
  /// Unfortunetely, we have a lot of setup to do
  ///
  var init = function () {
    ///
    /// As this runs, init socket if it's not already
    ///
//    socket.connect(api.token);
//    socket.addListener('message', onMessage);

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
	      console.log('Failed to find Avatar!', err);
	      $scope.avatars[member._id] = '/img/default_avatar.png';
	      callback();
	    });
	}, function(err) {
	  console.log('Finished getting Avatars. Error? ', err);
	});

      } else {
	$location.path('/chat/0');
      }
    });
  };

  init();

}]);
