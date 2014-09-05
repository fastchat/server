fastchat.controller('ProfileController', ['$scope', 'api', function ($scope, api) {

  $scope.profile = null;
  
  api.profile()
    .then(function(profile) {
      $scope.profile = profile;
      $scope.profileImage();
    });

  $scope.profileImage = function() {
    api.profileImage()
      .then(function(url) {
	var img = document.querySelector( "#profileImage" );
	img.src = url;
      });
  }


  $scope.uploadAvatar = function() {
   
    var toUpload = document.getElementById('avatarField');
    console.log('Uploading:', toUpload);

    api.uploadAvatar(toUpload.files[0]);
  };

}]);
