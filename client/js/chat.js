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



$(document).ready(function() {

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
	API.invite(params.value, gps[currentGroup]._id, function(err, success) {
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

  $('#new_group').editable({
    value: '',
    autotext: 'never',
    emptytext: '',
    display: false,
    url: function(params) {
      var q = new $.Deferred;
      if(params.value && params.value.trim() === '') {
        return q.reject('Group Name is required!');
      } else {
	API.newGroup(params.value, function(err, group) {
	  if (!err && group) {
	    getGroupsAndUpdateUI();
	    getProfile();
	    q.resolve();
	  } else {
	    q.reject(err);
	  }
	});
      }
    },
    success: function(response, newValue) {
      $('#new_group').editable('setValue', null)
        .editable('option', 'pk', null);
    }
  });

  if (API.isLoggedIn()) {
    getGroupsAndUpdateUI();
    getProfile();
  } else {
    window.location.replace(url() + '/login.html');
  }
});

function getGroupsAndUpdateUI() {
  API.groups(function(err, groups) {
    
    if (!err && groups) {
      gps = groups;

      $('#group-nav').empty();
      
      for (var i = 0; i < groups.length; i++) {
	var group = groups[i];
	
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
    } else if (err) {
      if (err.status === 401) {
//	window.location.replace(url() + '/login.html');
      }
    }
  });
}

function getProfile() {
  API.profile(function(err, profile) {
    if (profile) {
      currentProfile = profile;
      console.log('Got current profile: ' + JSON.stringify(profile, null, 4));
    }
  });
}

function sendMessage() {
  
  var messageField = $('#message');
  var message = messageField.val();
  if (message) {
    messageField.val('');
    window.socket.SocketServer.send({'from': currentProfile.username, 'text': message, 'groupId' : gps[currentGroup]._id}, gps[currentGroup]._id);
    appendMessage(currentProfile.username, message);
  }

  Notify.requestPermission();
  return false;
};

function changeGroup(link) {
  var groupNumber = link.className.split(' ')[1].slice(-1);
  console.log('Clicked: ' + groupNumber);
  changeToGroup(groupNumber);
};

function changeToGroup(num) {
  currentGroup = num;
  console.log('Now in Group: ' + gps[currentGroup].name);

  for(var i = 0; i < gps.length; i++) {
    $('.group' + i).removeClass('active');
  }

  $('.group' + num).addClass('active');
  $('#group_name').text('Group: ' + gps[currentGroup].name);

  window.socket.SocketServer.addListener('message', function(message) {
    appendMessage(message.from, message.text);

    if (isBlurred) {
      var messageNotification = new Notify(message.from, {
	body: message.text,
	notifyShow: onNotifyShow,
	notifyClick: notifClicked
      });
      notifications.push(messageNotification);
      messageNotification.show();

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
    window.location.replace(url() + '/index.html');
  });
};
