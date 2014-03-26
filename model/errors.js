/**
 * A simple object for turning nasty errors into user friendly errors.
 * This method should be used for the register errors.
 *
 * @error The error object to be parsed.
 */
exports.parseRegisterError = function(error) {
  var message = error.message;
  console.log('MESSAGE: '+ message);
  if (message.indexOf('E11000') > -1) {
    return 'That username was already taken.';
  } else if (message.indexOf('Validation failed') > -1) {
    return 'Username and password are required!';
  }
};
