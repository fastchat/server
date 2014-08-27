fastchat.controller('LoginController', ['$scope', '$location', 'api', function ($scope, $location, api) {

  $scope.error = false;

  $scope.login = function(){
    console.log($scope.username, $scope.password);
    api.login($scope.username, $scope.password)
      .then(function(data) {
	console.log(data);
	if (data === true) {
	  $location.path('chat');
	} else {
	  $('#login_errors').text(data.data.error);
	  $('#login_errors').show();
	}
      });
  };

}]);
