
$(document).ready(function() {

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
    }
  });

  

});

function sendMessage() {
  
  var messageField = $('#message');
  var message = messageField.val();
  messageField.val('');

  var txt = $("#main_chat");
  txt.val( txt.val() + "\n" + 'You' + ": " + message);

  server.send({'from': 'Web!', 'text': message}, gps[currentGroup]._id);

  return false;
};

function changeGroup(link) {
  var groupNumber = link.className.split(' ')[1].slice(-1);
  console.log('Clicked: ' + groupNumber);
  changeToGroup(groupNumber);
};

function changeToGroup(num) {
  currentGroup = num;
  //update nav bar

  //later...
  server = new socket.SocketServer(chat.token, function(message) {
    
    var txt = $("#main_chat");
    txt.val( txt.val() + "\n" + message.from + ": " + message.text);

  });
  
};
