var timer = "";
var isBlurred=false;

$(window).on('blur',function() {
  isBlurred = true;
}).on("focus",function() { 
  isBlurred = false;
  document.title = 'Fast Chat';
  clearInterval(timer);
});



$(document).ready(function() {

  if (chat.isLoggedIn()) {
    chat.groups(function(err, groups) {
      
      if (!err && groups) {
	gps = groups;
	
	for (var i = 0; i < groups.length; i++) {
	  var group = groups[i];
	  
	  $('#navigation_bar').append(
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
	  window.location.replace(url() + '/login.html');
	}
      }
    });

    chat.profile(function(err, profile) {
      if (profile) {
	currentProfile = profile;
	console.log('Got current profile: ' + JSON.stringify(profile, null, 4));
      }
    });
  } else {
    window.location.replace(url() + '/login.html');
  }
});

function sendMessage() {
  
  var messageField = $('#message');
  var message = messageField.val();
  if (message) {
    messageField.val('');
    var txt = $("#main_chat");
    txt.val( txt.val() + "\n" + currentProfile.username + ": " + message);
    server.send({'from': currentProfile.username, 'text': message}, gps[currentGroup]._id);  
    keepToBottom();
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

  $('#group_name').text('Group: ' + gps[currentGroup].name);

  server = new socket.SocketServer(chat.token, function(message) {
    var txt = $("#main_chat");
    txt.val( txt.val() + "\n" + message.from + ": " + message.text);
    keepToBottom();

    var messageNotification = new Notify(message.from, {
      body: message.text,
      notifyShow: onNotifyShow,
      notifyClick: notifClicked
    });
    messageNotification.show();

    if (isBlurred) {
      timer = window.setInterval(function() {
	document.title = document.title === 'Fast Chat' ? message.from + ' - Fast Chat' : 'Fast Chat';
      }, 1000);
    }   
  });
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
    chat.invite(userToInvite, gps[currentGroup]._id, function(err, success) {
      console.log('Success? ' + success);
    });
  }
};

function keepToBottom() {
  $(document).ready(function(){
    $('#main_chat').scrollTop($('#main_chat')[0].scrollHeight);
  });
};

