fastchat.controller('NavbarController', ['$scope', '$interval', '$location', 'api', function($scope, $interval, $location, api) {

  $scope.logout = function() {
    console.log('LOGGING OUT');
    api.logout()
      .then(function(response) {
	if (response.status == 200) {
	  $location.path('/');
	}
      });
    return false;
  };
  
  $scope.isLoggedIn = function() {
    return api.isLoggedIn();
  };
  
  $scope.show = false;
  $scope.title = 'Features in 0.5.0-Beta';
  $scope.content = 'Hello, World!';
  var EIGHT_HOURS = 28800000;

  var newContent = function() {
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
  }

  $interval(newContent, EIGHT_HOURS);
}]);
