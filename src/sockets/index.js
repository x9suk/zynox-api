const { Server } = require('socket.io');
const config = require('../config/env');
const logger = require('../utils/logger');
const { socketAuth } = require('./auth');
const setupSocketEvents = require('./events');
const cacheService = require('../services/cache.service');
const realtimeService = require('../services/realtime.service');

function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
    maxHttpBufferSize: 1e6,
  });

  io.use(socketAuth);

  io.on('connection', async (socket) => {
    logger.info({
      socketId: socket.id,
      developer: socket.developer?.discordId,
      plan: socket.apiKey?.plan,
      ip: socket.handshake.address,
    }, 'Socket connected');

    await cacheService.setSocketSession(socket.id, {
      developerId: socket.developer?.id,
      discordId: socket.developer?.discordId,
      plan: socket.apiKey?.plan,
      scopes: socket.apiKey?.scopes,
      connectedAt: Date.now(),
    });

    socket.on('disconnect', async (reason) => {
      logger.info({ socketId: socket.id, reason }, 'Socket disconnected');
      await cacheService.deleteSocketSession(socket.id);
    });

    socket.on('error', (err) => {
      logger.error({ err, socketId: socket.id }, 'Socket error');
    });

    setupSocketEvents(socket);
  });

  realtimeService.setIO(io);

  logger.info('Socket.IO server initialized');
  return io;
}

module.exports = createSocketServer;
