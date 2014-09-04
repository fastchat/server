fastchat.controller('ProfileController', ['$scope', 'api', function ($scope, api) {

  $scope.profile = null;
  
  api.profile()
    .then(function(profile) {
      $scope.profile = profile;
    });


  $scope.uploadAvatar = function() {
    console.log('Uploading!', $scope.avatar);
    api.uploadAvatar($scope.avatar);
  };

}]);
