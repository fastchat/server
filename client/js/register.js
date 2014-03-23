function register() {
  
  console.log('Registering!');

  var email = document.getElementById("input_email").value;
  var password = document.getElementById("input_password").value;
  chat.register(email, password, function(err, success) {
    if (success) {
      chat.login(email, password, function(err, success) {
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
