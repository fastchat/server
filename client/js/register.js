function register() {
  
  console.log('Registering!');

  var username = document.getElementById("input_username").value;
  var password = document.getElementById("input_password").value;
  var confirmation = document.getElementById("input_confirmation").value;
  
  var errors = [];
  if (!username) errors.push('Username is required!');
  if (!password) errors.push('Password is required!');
  if (!confirmation) errors.push('Please confirm your password!');
  if (password && confirmation && password !== confirmation) errors.push('Your passwords do not match!');

  if (errors.length === 0) {
    API.register(username, password, function(err, success) {
      if (success) {
	API.login(username, password, function(err, success) {
	  window.location.replace(url() + '/chat.html');
	  $('#register_errors').hide();
	});
      } else {
	console.log('Did not register!');
	showError([err.responseJSON.error]);
      }
    });
  } else {
    showErrors(errors);
  }

  return false;
};

function showErrors(errors) {
  var message = errors.join('\n');
  $('#register_errors').text(message);
  $('#register_errors').show();
  console.log('Showing ' + message);
};
