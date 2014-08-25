var timer = '';
var isBlurred=false;
var notSeenMessages = 0;
var notifications = [];

$(window).on("blur", function() {
  isBlurred = true;
}).on("focus", function() {
  clearInterval(timer);
  console.log('ON FOCUUSSSSS');
  isBlurred = false;
  document.title = 'Fast Chat';
  timer = '';
  notSeenMessages = 0;

  for (var i = 0; i < notifications.length; i++) {
    var note = notifications[i];
    note.close();
  }
  notifications.length = 0;
});

var app = angular.module('fastchat', ['ngRoute', 'infinite-scroll']);
 
app.config(function($routeProvider) {
  $routeProvider
    .when('/:num', {
      controller:'GroupCtrl',
      templateUrl:'messages.html'
    })
    .otherwise({
      redirectTo:'/0'
    });
});


app.controller('GroupCtrl', function($scope, $http, $routeParams, $route) {

  console.log('Group: ' + $routeParams.num);

  $http.defaults.headers.common = { 'session-token' : API.getToken() };

  $http.get('/user').success(function(profile) {
    $scope.profile = profile.profile;
    
    $http.get('/group' ).success(function(groups) {
  
      $scope.group = groups[$routeParams.num];
      $scope.members = buildMemberLookUp($scope.group);

      for (var i = 0; i < groups.length; i++) {
	groups[i].num = i;
      }

      $scope.groups = groups;

      ///
      /// Setup socket.io
      ///
      window.socket.SocketServer.addListener('message', function(message) {
	console.log('Message: ' + JSON.stringify(message, null, 4));
	console.log('Group: ' + JSON.stringify(gps[currentGroup], null, 4));

	if (message.group === $scope.group._id) {
	  $scope.messages.push(message);
	  scrollToBottom();
	}

	if (isBlurred) {
	  var messageNotification = new Notify(memberLookup[message.from], {
	    body: message.text,
	    notifyShow: onNotifyShow,
	    notifyClick: notifClicked
	  });
	  notifications.push(messageNotification);
	  messageNotification.show();

	  setInterval(function() {
	    messageNotification.close();
	  }, 3000);

	  console.log('IS BLURRED');
	  notSeenMessages++;
	  console.log('Not Seen: ' + notSeenMessages);
	  if (!timer) {
	    console.log('NOT TIMER');
	    timer = window.setInterval(function() {
	      console.log('BLINK');
	      document.title = document.title === 'Fast Chat' ? '(' + notSeenMessages + ')' + ' - Fast Chat' : 'Fast Chat';
	    }, 1000);
	  }
	}
      });

      $http.get('/group/' + $scope.group._id + '/message').success(function(messages) {
	messages = messages.reverse();
	$scope.messages = messages;
	scrollToBottom();
      });
    
    });

  }).
    error(function(data) {
      $scope.error = data;
    });

  $scope.sendMessage = function() {
    $scope.messages.push({from: $scope.profile._id, text: $scope.messageText, group: $scope.group._id});
    scrollToBottom();
    window.socket.SocketServer.send({'text': $scope.messageText, 'group' : $scope.group._id});
    $scope.messageText = '';
  };

});

function buildMemberLookUp(group) {
  var members = {};
  if (group.members) {
    group.members.forEach(function(mem) {
      members[mem._id] = mem.username;
    });
  }

  if (group.leftMembers) {
    group.leftMembers.forEach(function(mem) {
      members[mem._id] = mem.username;
    });
  }

  return members;
}

function scrollToBottom() {
  $("#chatbox").scrollTop($("#chatbox")[0].scrollHeight);
}





/*
var timer = '';
var isBlurred=false;
var notSeenMessages = 0;
var notifications = [];
var page = 0;
var memberLookup = {};

$(window).on("blur", function() {
  isBlurred = true;
}).on("focus", function() {
//  getAvatar();
  clearInterval(timer);
  console.log('ON FOCUUSSSSS');
  isBlurred = false;
  document.title = 'Fast Chat';
  timer = '';
  notSeenMessages = 0;

  $("#message").focus();

  for (var i = 0; i < notifications.length; i++) {
    var note = notifications[i];
    note.close();
  }
  notifications.length = 0;
});



$(document).ready(function() {

  window.socket.SocketServer.addListener('new_group', function(group) {
    console.log('NEW GROUP MESSAGE: ' + JSON.stringify(group, null, 4));
  });

  $('#invite_user').editable({
    value: '',
    autotext: 'never',
    emptytext: '',
    display: false,
    url: function(params) {
      var q = new $.Deferred;
      if(params.value && params.value.trim() === '') {
        return q.reject('Username is required!');
      } else {
	API.addToGroup(params.value, gps[currentGroup]._id, function(err, success) {
	  if (err) return q.reject(err);
	  return q.resolve();
	});
      }
    },
    success: function(response, newValue) {
      $('#invite_user').editable('setValue', null)
        .editable('option', 'pk', null);
    }
  });

  $( "#main_chat" ).scroll(function() {
    if ($("#main_chat").scrollTop() < 20) {
      page++;

      API.messages(gps[currentGroup]._id, page, function(err, messages) {
	var messages = messages.reverse();
	
	for (var i = messages.length - 1; i > 0; i--) {
	  var mes = messages[i];
	  prependMessage(memberLookup[mes.from], mes.text);
	}
    
	console.log('Got messages');
      });      
      

    }

  });

  if (API.isLoggedIn()) {
    getProfile(function() {
      getGroupsAndUpdateUI();
    });
  } else {
    window.location.replace('/login.html');
  }
});

function groupName(members) {
  var name = '';
  members.forEach(function(user) {
    if (user._id !== currentProfile._id) {
      name += user.username + ', ';
    }
  });

  if (name.length > 2) {
    return name.substr(0, name.length - 2);
  }
  return name;
};

function getGroupsAndUpdateUI(cb) {
  API.groups(function(err, groups) {
    
    if (!err && groups) {
      gps = groups;

      for (var j = 0; j < gps.length; j++) {
	for (var i = 0; i < gps[j].members.length; i++) {
	  var aMember = gps[j].members[i];
	  memberLookup[aMember._id] = aMember.username;
	}
      }

      $('#group-nav').empty();
      
      for (var i = 0; i < groups.length; i++) {
	var group = groups[i];
	
	if (!group.name) {
	  group.name = groupName(group.members);
	}

	console.log('USING NAME: ' + group.name);

	$('#group-nav').append(
	  $('<li/>', {
	    'class': 'nav-bar-group group' + i,
            html: $('<a/>', {
	      href: '#',
	      text: group.name
	    })
	  })
	);
	
      }

      jQuery( '.nav-bar-group' )
	.click(function() {
	  changeGroup(this);
	  return false;
	});

      if (groups.length > 0) {
	changeToGroup(0);
      }
      
      if (cb) {
	cb();
      }
    } else if (err) {
      if (err.status === 401) {
//	window.location.replace('/login.html');
      }
    }
  });
}

function getProfile(cb) {
  API.profile(function(err, profile) {
    if (profile) {
      currentProfile = profile;
      console.log('Got current profile: ' + JSON.stringify(profile, null, 4));
      cb();
    }
  });
}

function sendMessage() {
  
  var messageField = $('#message');
  var message = messageField.val();
  if (message) {
    messageField.val('');
    window.socket.SocketServer.send({'text': message, 'group' : gps[currentGroup]._id});
    appendMessage(currentProfile.username, message);
  }

  Notify.requestPermission();
  return false;
};

function changeGroup(link) {
  var groupNumber = link.className.split(' ')[1].replace('group', '');
  console.log('Clicked: ' + groupNumber);
  changeToGroup(groupNumber);
};

function changeToGroup(num) {
  currentGroup = num;
  console.log('Now in Group: ' + gps[currentGroup].name);

  /// Remove the text
  $("#main_chat").val("");

  for(var i = 0; i < gps.length; i++) {
    $('.group' + i).removeClass('active');
  }

  $('.group' + num).addClass('active');
  $('#group_name').text('Group: ' + gps[currentGroup].name);

  API.messages(gps[currentGroup]._id, 0, function(err, messages) {
    
    var messages = messages.reverse();

    for (var i = 0; i < messages.length; i++) {
      var mes = messages[i];
      appendMessage(memberLookup[mes.from], mes.text);
    }
    
    console.log('Got messages');
  });

  window.socket.SocketServer.addListener('message', function(message) {
    console.log('Message: ' + JSON.stringify(message, null, 4));
    console.log('Group: ' + JSON.stringify(gps[currentGroup], null, 4));

    if (message.group === gps[currentGroup]._id) {
      appendMessage(memberLookup[message.from], message.text);
    }

    if (isBlurred) {
      var messageNotification = new Notify(memberLookup[message.from], {
	body: message.text,
	notifyShow: onNotifyShow,
	notifyClick: notifClicked
      });
      notifications.push(messageNotification);
      messageNotification.show();

      setInterval(function() {
	messageNotification.close();
      }, 3000);

      console.log('IS BLURRED');
      notSeenMessages++;
      console.log('Not Seen: ' + notSeenMessages);
      if (!timer) {
	console.log('NOT TIMER');
	timer = window.setInterval(function() {
	  console.log('BLINK');
	  document.title = document.title === 'Fast Chat' ? '(' + notSeenMessages + ')' + ' - Fast Chat' : 'Fast Chat';
	}, 1000);
      }
    }
  });
};

function appendMessage(from, text) {
  var txt = $("#main_chat");
  txt.val( txt.val() + "\n" + from + ": " + text);
  keepToBottom();
};

function prependMessage(from, text) {
  var currentHeight = $('#main_chat')[0].scrollHeight;

  var txt = $("#main_chat");
  txt.val( from + ": " + text + "\n" + txt.val());

  $('#main_chat').scrollTop(currentHeight);
};

function onNotifyShow() {
    console.log('notification was shown!');
};

function notifClicked() {
  console.log('Notification was clicked!');
};

function inviteToGroup() {

  var userToInvite = prompt("Invite User: ", "username");

  if (userToInvite) {

  }
};

function keepToBottom() {
  $(document).ready(function(){
    $('#main_chat').scrollTop($('#main_chat')[0].scrollHeight);
  });
};


function newGroup() {
  
  console.log('New Group!');

  var groupName = document.getElementById("input_name").value;

  return false;
};

function logout() {
  API.logout(function(err, success) {
    window.location.replace('/index.html');
  });
};

///testing
function uploadMedia() {
  console.log('Uploading!');


  var messageField = $('#message');
  var inputElement = document.getElementById('mediaField');
  console.log('WHAT: ' + inputElement);

  var formData = new FormData();
  formData.append('text', messageField.val());
  formData.append('media', inputElement.files[0]);

  var url = '/group/'+gps[currentGroup]._id+'/message';

  var request = new XMLHttpRequest();
  request.open('POST', url);
  request.setRequestHeader('session-token', API.getToken());
  request.send(formData);

  messageField.val('');
  
  return false;
};

function getAvatar() {

  var xhr = new XMLHttpRequest();

  console.log('HERE');
  // Use JSFiddle logo as a sample image to avoid complicating
  // this example with cross-domain issues.
  xhr.open( "GET", '/group/'+gps[currentGroup]._id+'/message/'+'534d94b8382f50f308000001/media');
  xhr.setRequestHeader('session-token', API.getToken());
  xhr.responseType = "arraybuffer";

  xhr.onload = function( e ) {
    console.log('GOT SOMETHING');
    console.log(e);
    // Obtain a blob: URL for the image data.
    var arrayBufferView = new Uint8Array( this.response );
    var blob = new Blob( [ arrayBufferView ], { type: "image/jpg" } );
    var urlCreator = window.URL || window.webkitURL;
    var imageUrl = urlCreator.createObjectURL( blob );
    console.log('URL: ' + imageUrl);
    var img = document.querySelector( "#media" );
    img.src = imageUrl;
  };

  xhr.send();

};

*/

