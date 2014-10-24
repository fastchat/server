require('blanket')
should = require('chai').should()
User = require('../../index').User

describe 'User', ->

  it 'should make a random token', ->
    user = new User()
    result = user.generateRandomToken()
