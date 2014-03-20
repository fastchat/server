$(document).ready(function() {

  console.log('Chat: ' + JSON.stringify(chat, null, 4));

  if (!chat.isLoggedIn()) {
    showLogIn();
  } else {
    window.location.replace(url() + '/chat.html');
  }
});


function login() {
  
  console.log('Logged in!');

  var email = document.getElementById("input_email").value;
  var password = document.getElementById("input_password").value;
  chat.login(email, password, function(err, success) {
    if (success) {
      
//      window.location.replace(URL + '/chat.html');
    }
  });
  return false;
};
