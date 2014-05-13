module.exports = process.env.FASTCHAT_COV
  ? require('./lib-cov/fastchat')
  : require('./lib/fastchat');
