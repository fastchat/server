require('blanket');
var should = require('chai').should();
var User = require('../../index').User;

describe('User', function () {

  it('should make a random token', function() {
    var user = new User();
    var result = user.generateRandomToken();
  });
  
});
