const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');

async function connectDatabase() {
  const uri = config.mongodb.uri;

  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connected successfully');
  });

  mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'MongoDB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed due to app termination');
    process.exit(0);
  });

  await mongoose.connect(uri, {
    maxPoolSize: 10,
    minPoolSize: 2,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 5000,
    heartbeatFrequencyMS: 10000,
    retryWrites: true,
    w: 'majority',
  });

  return mongoose.connection;
}

module.exports = { connectDatabase };
