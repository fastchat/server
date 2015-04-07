'use strict'
#
# FastChat
# 2015
#

should = require('chai').should()
AWS = require '../../lib/model/aws'
sinon = require 'sinon'
EventEmitter = require('events').EventEmitter

describe 'AWS', ->

  it 'should exist', ->
    should.exist AWS

  it 'should not create knox with no keys', ->
    key = process.env['AWS_KEY']
    secret = process.env['AWS_SECRET']
    process.env['AWS_KEY'] = ''
    process.env['AWS_SECRET'] = ''
    aws = new AWS()
    should.not.exist aws.knox
    process.env['AWS_KEY'] = key or ''
    process.env['AWS_SECRET'] = secret or ''

  it 'should create knox with aws info', ->
    aws = new AWS('bucket', 'key', 'secret')
    should.exist aws.knox

  it 'should return an error without knox', ->
    key = process.env['AWS_KEY']
    secret = process.env['AWS_SECRET']
    process.env['AWS_KEY'] = ''
    process.env['AWS_SECRET'] = ''
    aws = new AWS('bucket')
    aws.upload 'stream', 'name', {}, (err)->
      err.message.should.equal 'AWS_KEY or AWS_SECRET was not available! S3 access is disabled!'
    process.env['AWS_KEY'] = key
    process.env['AWS_SECRET'] = secret


  it 'fail to get without aws info', ->
    aws = new AWS('bucket')
    aws.on 'error', (err)->
      err.message.should.equal 'AWS_KEY or AWS_SECRET was not available! S3 access is disabled!'
    aws.get('name')

  it 'should upload with knox', (done)->
    key = process.env['AWS_KEY']
    secret = process.env['AWS_SECRET']
    process.env['AWS_KEY'] ?= 'test_key'
    process.env['AWS_SECRET'] ?= 'test_secret'
    aws = new AWS('bucket')
    stub = sinon.stub(aws.knox, 'putStream')
    aws.upload 'stream', 'name', {}, (err, res)->
      res.should.equal 'stream'
      process.env['AWS_KEY'] = key
      process.env['AWS_SECRET'] = secret
      stub.restore()
      done()
    stub.yield(null, 'stream')

  it 'should fetch with knox', ->
    process.env['AWS_KEY'] ?= 'test_key'
    process.env['AWS_SECRET'] ?= 'test_secret'
    aws = new AWS('bucket')
    returned = new EventEmitter()
    stub = sinon.stub(aws.knox, 'get').returns(returned)
    aws.get('name').on 'response', (res)->
      res.should.equal 'rrr'
    returned.emit('response', 'rrr')
