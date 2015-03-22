Helpers = require('../../lib/helpers/helpers')()
mongoose = require('mongoose-q')()
ObjectId = mongoose.Types.ObjectId

describe 'Helpers', ->

  it 'should get the index', ->
    toFind = new ObjectId()
    array = [new ObjectId(), new ObjectId(), new ObjectId(), toFind]
    array.should.have.length 4
    index = array.indexOfEquals toFind
    index.should.equal 3

  it 'should get the index with objects', ->
    toFind = {property: new ObjectId()}
    array = [
      {property: new ObjectId()}
      {property: new ObjectId()}
      {property: new ObjectId()}
      {property: new ObjectId()}
      toFind
    ]
    array.should.have.length 5
    index = array.indexOfEquals toFind.property, 'property'
    index.should.equal 4
    index = array.indexOfEquals new ObjectId(), 'property'
    index.should.equal -1

  it 'should find the key in an array', ->
    array = [1,2,3,4,5]
    array2 = [4,5]
    diff = array.diff(array2)
    diff.should.include.members([1, 2, 3])

  it 'should return the diff when given objects', ->
    same1 = {property: new ObjectId()}
    same2 = {property: new ObjectId()}

    first = [
      {property: new ObjectId()}
      {property: new ObjectId()}
      same1
      same2
    ]

    second = [
      same1
      same2
    ]

    diffed = first.diff second, 'property'
    diffed.should.have.length 2
    diffed.should.not.contain same1
    diffed.should.not.contain same2
