const http = require('http');
const app = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger');
const { connectDatabase } = require('./config/database');
const { startBot, stopBot } = require('./bot/client');
const registerEvents = require('./bot/events');
const createSocketServer = require('./sockets');
const scheduler = require('./services/scheduler.service');

async function start() {
  logger.info(`Starting server in ${config.server.env} mode...`);

  await connectDatabase();

  registerEvents(require('./bot/client').client);

  const botClient = await startBot();

  const httpServer = http.createServer(app);

  createSocketServer(httpServer);

  scheduler.start();

  const server = httpServer.listen(config.server.port, config.server.host, () => {
    logger.info(`Server listening on http://${config.server.host}:${config.server.port}`);
    logger.info(`Health check: http://localhost:${config.server.port}/api/v1/health`);
    logger.info(`Socket.IO ready on port ${config.server.port}`);
  });

  function gracefulShutdown(signal) {
    logger.info(`${signal} received. Shutting down gracefully...`);

    server.close(async () => {
      logger.info('HTTP server closed');

      scheduler.stop();

      if (botClient) {
        await stopBot();
      }

      const { getRedis } = require('./config/redis');
      try {
        const redis = await getRedis();
        redis.disconnect();
        logger.info('Redis disconnected');
      } catch {
        // ignore
      }

      try {
        const mongoose = require('mongoose');
        await mongoose.connection.close();
        logger.info('MongoDB disconnected');
      } catch {
        // ignore
      }

      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 15000);
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled rejection');
  });
}

start().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
