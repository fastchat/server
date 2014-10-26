module.exports =
  dev:
    databaseUrl: 'mongodb://localhost/dev'
    baseUrl: 'localhost'

  test:
    databaseUrl: 'mongodb://localhost/test'
    baseUrl: 'localhost'

  production:
    databaseUrl: 'mongodb://mongo_dev_user1:zJYBZWPEcvKkuGpYJxHoTKRGGc8G4bdqftzgqQbybEYsFThosN@ds031088.mongolab.com:31088/MongoLab-92'
    baseUrl: 'https://www.fastchat.io/'

config = dev

if process.env.NODE_ENV
  switch process.env.NODE_ENV
    when 'production'
      config = production
    when 'staging'
      config = staging

module.exports = config
