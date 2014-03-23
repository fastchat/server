function register() {
  
  console.log('Registering!');

  var username = document.getElementById("input_username").value;
  var password = document.getElementById("input_password").value;
  chat.register(username, password, function(err, success) {
    if (success) {
      chat.login(username, password, function(err, success) {
	window.location.replace(url() + '/chat.html');
      });
    } else {
      console.log('Did not register!');
      $('#register_errors').text(err.responseJSON.error);
      $('#register_errors').show();
    }
  });
  return false;
};
