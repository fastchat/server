fastchat.controller('NavbarController', ['$scope', '$timeout', 'api', function($scope, $timeout, api) {
  
  $scope.isLoggedIn = function() {
    return api.isLoggedIn();
  };
  
  $scope.show = false;
  $scope.title = 'Features in 0.5.0-Beta';
  $scope.content = 'Hello, World!';

  $scope.newContent = function() {
    api.whatIsNew()
      .then(function(whatsNew) {
	if (whatsNew) {
	  $scope.show = true;
	  $scope.title = whatsNew.title;
	  $scope.content = whatsNew.content;
	} else {
	  $scope.show = false;
	}
      });

    $timeout($scope.newContent, 28800000);
  }

  $scope.newContent();

}]);
