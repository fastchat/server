require('blanket');
var should = require('chai').should();
var Message = require('../../index').Message;

describe('Messages', function () {

  it('should exist', function() {
    should.exist(Message);
  });
});
