module.exports = {
  dev: {
    databaseUrl: 'mongodb://localhost/dev',
    baseUrl: 'http://localhost'
  },

  test: {
    databaseUrl: 'mongodb://localhost/dev',
    baseUrl: 'http://localhost'
  },

  production: {
    databaseUrl: 'mongodb://mongo_dev_user1:zJYBZWPEcvKkuGpYJxHoTKRGGc8G4bdqftzgqQbybEYsFThosN@ds031088.mongolab.com:31088/MongoLab-92',
    baseUrl: 'https://something'
  }
};
