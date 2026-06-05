const { ApiKey } = require('../models');
const { sha256 } = require('../utils/hash');
const abuseService = require('../services/abuse.service');
const logger = require('../utils/logger');

async function socketAuth(socket, next) {
  try {
    const apiKey = socket.handshake.query['x-api-key'] || socket.handshake.auth?.token;

    if (!apiKey) {
      return next(new Error('Missing x-api-key'));
    }

    const ip = socket.handshake.address || socket.conn?.remoteAddress || 'unknown';

    const blocked = await abuseService.isIpBlocked(ip);
    if (blocked.blocked) {
      return next(new Error('IP is temporarily blocked'));
    }

    const keyHash = sha256(apiKey);
    const keyDoc = await ApiKey.findOne({ keyHash })
      .populate('developer')
      .lean();

    if (!keyDoc) {
      await abuseService.recordFailedAuth(ip, apiKey.substring(0, 10));
      return next(new Error('Invalid API key'));
    }

    if (!keyDoc.isActive) {
      await abuseService.recordFailedAuth(ip, keyDoc.keyPrefix);
      return next(new Error('API key is disabled'));
    }

    if (keyDoc.expiresAt && new Date(keyDoc.expiresAt) < new Date()) {
      await abuseService.recordFailedAuth(ip, keyDoc.keyPrefix);
      return next(new Error('API key has expired'));
    }

    const developer = keyDoc.developer;
    if (!developer || developer.isBanned) {
      return next(new Error('Account is banned'));
    }

    socket.apiKey = {
      id: keyDoc._id,
      name: keyDoc.name,
      plan: keyDoc.plan,
      scopes: keyDoc.scopes,
    };

    socket.developer = {
      id: developer._id,
      discordId: developer.discordId,
      username: developer.username,
      plan: developer.plan,
    };

    socket.subscribedRooms = [];

    next();
  } catch (err) {
    logger.error({ err }, 'Socket auth error');
    next(new Error('Authentication failed'));
  }
}

function getAvailableRooms(scopes) {
  const rooms = [];
  if (scopes.includes('*') || scopes.includes('presence:read')) {
    rooms.push('presence:all');
  }
  if (scopes.includes('*') || scopes.includes('bot:read')) {
    rooms.push('bot:all');
  }
  return rooms;
}

module.exports = { socketAuth, getAvailableRooms };
