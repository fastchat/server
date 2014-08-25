fastchat.controller('RegisterController', ['$scope', 'api', function ($scope, api) {

  $scope.error = false;

  $scope.register = function(){
    console.log($scope.username, $scope.password, $scope.passwordConfirm);
     api.register($scope.username, $scope.password);
  };

}]);
