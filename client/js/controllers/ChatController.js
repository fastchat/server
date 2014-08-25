fastchat.controller('ChatController', ['$scope', 'api', function ($scope, api) {

  var currentGroup = -1;
  
  $scope.currentGroup = '--';
  $scope.groups = [];

  $scope.chat = function() {

  };


  var init = function () {
    console.log(api)
    api.groups().then(function(groups) {
      console.log('Groups!', groups);
      $scope.groups = groups
      if (groups.length > 0) {
	$scope.currentGroup = groups[0];
      }
    });
  };

  init();

}]);

