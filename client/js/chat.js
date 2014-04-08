var timer = '';
var isBlurred=false;
var notSeenMessages = 0;
var notifications = [];
var page = 0;
var memberLookup = {};

$(window).on("blur", function() {
  isBlurred = true;
}).on("focus", function() {
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
    window.location.replace(url() + '/login.html');
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
//	window.location.replace(url() + '/login.html');
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
    window.location.replace(url() + '/index.html');
  });
};
