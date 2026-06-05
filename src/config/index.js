const config = require('./env');
const { connectDatabase } = require('./database');
const { getRedis } = require('./redis');

module.exports = {
  config,
  connectDatabase,
  getRedis,
};
