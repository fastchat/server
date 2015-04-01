'use strict'
#
# FastChat
# 2015
#

should = require('chai').should()
APN = require '../../lib/model/apn'

describe 'APN', ->

  it 'should exist', ->
    should.exist APN
    APN.should.be.an.object

  it 'should have no opts by default', ->
    APN.opts.production.should.be.no
    should.not.exist APN.opts.certData
    should.not.exist APN.opts.keyData
