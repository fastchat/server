var invites = null;

$(document).ready(function() {

  if (!chat.isLoggedIn()) {
    showLogIn();
  } else {
    profile();
  }

});


function profile() {
  
  console.log('Getting profile!');

  chat.profile(function(err, profile) {
    if (err) return;
    setFields(profile);
  });

  return false;
};

function setFields(profile) {
  console.log('username: ' + profile['username']);
  $('.profile_name').text('Username: ' + profile['username']);

  invites = profile.invites;
  for (var i = 0; i < invites.length; i++) {
    var anInvite = invites[i];
    $('#profile_invites_list').append('<li>' + anInvite  + '<a class="accept_links ' + i + '" href="#">Accept</a> <a class="reject_links ' + i + '" href="#">Reject</a></li>');
  }

  $('.accept_links').click(function() {
      acceptInvite(this);
      return false;
    });

  $('.reject_links').click(function() {
      rejectInvite(this);
      return false;
    });

};

function acceptInvite(link) {

  console.log('Accept');
  var invite = Number($(link).attr('class').split(' ')[1]);

  if (invite > -1) {
    console.log('Link Clicked: ' + invite);
    chat.acceptInvite(invite, function(err, success) {
      console.log('Success? ' + success);
      if (success) {
	profile();
      } else {
	console.log('Error!');
      }      
    });
  }
};

function rejectInvite(link) {
  console.log('Reject');
};

function logout() {
  chat.logout(function(err, success) {
    console.log('Success: ' + success);
    chat.token = null;
    chat.saveToken();
    window.location.replace(url() + '/index.html');
  });
};
