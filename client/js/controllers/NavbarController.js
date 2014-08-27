fastchat.controller('NavbarController', ['$scope', 'api', function($scope, api) {
  
  $scope.isLoggedIn = function() {
    return api.isLoggedIn();
  };

}]);
