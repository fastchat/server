var helpers = require('../helpers');

describe('Helpers', function () {

  it('should find the key in an array', function() {

    var anArray = [
      {key: 'something', another: 'cool'},
      {key: 'something1', another: 'cool1'},
      {key: 'something2', another: 'cool2'},
      {key: 'something2', another: 'cool2', third: 'okay'}
    ];

    var test1 = anArray.indexOfKey('key', 'something2');
    var test2 = anArray.indexOfKey('key', 'something10');
    test1.should.equal(2);
    test2.should.equal(-1);

    var test3 = anArray.indexOfKey('whatever', 'test');
    test3.should.equal(-1);
  });

});
