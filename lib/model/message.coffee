mongoose = require('mongoose-q')()
Schema = mongoose.Schema
Boom = require('boom')
GroupSetting = require('./groupSetting')
Q = require('q')
fs = require('fs')
uuid = require('uuid')
PER_PAGE = 30


knox = require('knox').createClient
  key: process.env.AWS_KEY
  secret: process.env.AWS_SECRET
  bucket: 'com.fastchat.dev.messages'


Message = new Schema
  from: {type: Schema.Types.ObjectId, ref: 'User'}
  group: {type: Schema.Types.ObjectId, ref: 'Group'}
  text: String
  sent: Date
  type: {type: String, default: 'message'}
  hasMedia: {type: Boolean, default: false}
  media: [{type: String, default: []}]
  mediaHeader: [{type: String, default: []}]
  media_size: [{type: Number, default: []}]


Message.statics =

  fromGroup: (user, groupid, page)->
    throw Boom.notFound() unless user.hasGroup groupid
    page = 0 unless page

    Q.all([@findQ({group: groupid}, {}, {
      sort: {sent: -1},
      skip: page * PER_PAGE,
      limit: PER_PAGE
      }),
      GroupSetting.findOneQ(user: user.id, group: groupid)
    ]).spread (messages, gs)->
      gs.read()
      GroupSetting.totalUnread(user).then (unread)->
        user.push null, null, unread, true
      return messages;

  postMedia: (groupId, user, fields, files)->
    deferred = Q.defer()

    return deferred.reject 'File was not successfully uploaded!' unless files
    return deferred.reject 'Media was not successfully uploaded!' unless files.media

    file = files.media[0]
    return deferred.reject('File was not successfully uploaded!') unless file

    stream = fs.createReadStream(file.path)
    ext = fileExtension(file.originalFilename)
    randomName = uuid.v4() + (if ext then ('.' + ext) else '')
    Group = require('./group')
    io = require('../socket/socket')

    s3req = knox.putStream stream, randomName, {
      'Content-Type': file.headers['content-type']
      'Cache-Control': 'max-age=604800'
      'x-amz-acl': 'public-read'
      'Content-Length': file.size
    }, (err, result)=>
      return deferred.reject 'There was an error uploading your image!' if err

      # Add media name to the message to get later
      message = new @
        group: groupId
        from: user.id
        text: if fields.text then fields.text[0] else null
        sent: new Date()
        hasMedia: yes
        media: [result.req.path.replace(/^.*[\\\/]/, '')]
        mediaHeader: [file.headers['content-type']]
        media_size: [file.size]

      message.saveQ().then =>
        Group.findOneQ(_id: groupId)
      .then (group)=>
        group.messages.push message
        group.saveQ()
      .then =>
        io.messageToGroup user.id, groupId, 'message', message
        message;
      .then(deferred.resolve)
      .fail(deferred.reject)
      .done()

    s3req.on 'response', (s3res)->
      if s3res.statusCode < 200 or s3res.statusCode >= 300
        return deferred.reject error : 'There was an error uploading your image!'

    s3req.on 'error', (s3err)->
      console.log(s3err)
      console.trace()

    deferred.promise

fileExtension = (filename)->
  filename.split('.').pop()


Message.methods =

  getMedia: ->
    throw new Error('This message is not set to have media!') unless @hasMedia

    data = ''
    deferred = Q.defer()
    knox.get(@media).on 'response', (s3res)=>
      if s3res.statusCode < 200 or s3res.statusCode > 300
        return deferred.reject 'There was an error fetching your image!'

      s3res.setEncoding('binary')
      s3res.on 'data', (chunk)->
        data += chunk

      s3res.on 'end', =>
        if @media.length is 0 or @mediaHeader.length is 0
          return deferred.reject 'No Media on this message!'

        deferred.resolve([@mediaHeader[0], @media_size, data])
    .end()

    deferred.promise

module.exports = mongoose.model('Message', Message)
