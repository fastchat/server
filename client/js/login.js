function login() {
  
  console.log('Logged in!');

  var username = document.getElementById("input_username").value;
  var password = document.getElementById("input_password").value;
  chat.login(username, password, function(err, success) {
    if (success) {
      $('#login_errors').hide();
      window.location.replace(url() + '/chat.html');b
    } else {
      $('#login_errors').text(err.responseJSON.error);
      $('#login_errors').show();
    }
  });
  return false;
};
