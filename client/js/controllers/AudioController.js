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

    var audioSelect = $("select#audioSource");
    var audio = $("#audio");
    navigator.getUserMedia = navigator.getUserMedia ||
      navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

    function gotSources(sourceInfos) {
      for (var i = 0; i != sourceInfos.length; ++i) {
	var sourceInfo = sourceInfos[i];
	if (sourceInfo.kind === 'audio') {
	  audioSelect.append($("<option></option>")
		    .attr("value", sourceInfo.id)
		    .text( sourceInfo.label || 'microphone ') );
	} else {
	  console.log('Some other kind of source: ', sourceInfo);
	}
      }
    }

    if (typeof MediaStreamTrack === 'undefined') {
      alert('This browser does not support MediaStreamTrack.\n\nTry Chrome Canary.');
    } else {
      MediaStreamTrack.getSources(gotSources);
    }

    function start() {
      console.log('START');
      var audioSource = audioSelect.val();
      console.log('Source', audioSource);
      var constraints = {
	audio: {
	  optional: [{sourceId: audioSource}]
	}
      };
      navigator.getUserMedia(constraints, successCallback, errorCallback);
    }

    function successCallback(stream) {
      console.log('OKAY', stream);
      window.stream = stream; // make stream available to console
      audio.src = window.URL.createObjectURL(stream);
      audio.play();
    }

    function errorCallback(error){
      console.log("navigator.getUserMedia error: ", error);
    }

    start();


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
