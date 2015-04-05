'use strict'
#
# FastChat
# 2015
#

should = require('chai').should()
AWS = require '../../lib/model/aws'
sinon = require 'sinon'

describe 'AWS', ->

  it 'should exist', ->
    should.exist AWS

  it 'should not create knox with no keys', ->
    aws = new AWS()
    should.not.exist aws.knox

  it 'should create knox with aws info', ->
    aws = new AWS('bucket', 'key', 'secret')
    should.exist aws.knox

  it 'should return an error without knox', ->
    aws = new AWS('bucket')
    aws.upload 'stream', 'name', {}, (err)->
      err.message.should.equal 'AWS_KEY or AWS_SECRET was not available! S3 access is disabled!'

  it 'fail to get without aws info', ->
    aws = new AWS('bucket')
    aws.on 'error', (err)->
      err.message.should.equal 'AWS_KEY or AWS_SECRET was not available! S3 access is disabled!'

    aws.get('name')
