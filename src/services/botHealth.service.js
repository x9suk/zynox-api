const { Events } = require('discord.js');
const { getRedis } = require('../config/redis');
const config = require('../config/env');
const logger = require('../utils/logger');

const p = config.redis.prefix;

let _client = null;

const state = {
  status: 'disconnected',
  reconnectAttempts: 0,
  lastDisconnect: null,
  unstable: false,
  startTime: null,
  disconnectTimestamps: [],
};

function getBackoffDelay(attempt) {
  const delay = Math.min(Math.pow(2, attempt - 1) * 1000, 60000);
  return delay;
}

async function markUnstable() {
  try {
    state.unstable = true;
    const redis = await getRedis();
    await redis.set(`${p}bot:unstable`, '1', { EX: 600 });
    logger.warn('Bot marked as unstable');
  } catch (err) {
    logger.error({ err }, 'Failed to mark bot unstable in Redis');
  }
}

function startMonitoring(client) {
  _client = client;
  state.startTime = Date.now();
  state.status = 'connected';

  const onDisconnect = (event, shardId) => {
    state.status = 'reconnecting';
    state.reconnectAttempts++;
    state.lastDisconnect = new Date().toISOString();
    state.disconnectTimestamps.push(Date.now());

    const recent = state.disconnectTimestamps.filter(t => Date.now() - t < 600000);
    state.disconnectTimestamps = recent;

    if (recent.length > 5) {
      markUnstable();
    }

    const delay = getBackoffDelay(state.reconnectAttempts);
    logger.warn({
      shardId,
      attempt: state.reconnectAttempts,
      nextDelay: delay,
      event: event?.code || 'unknown',
    }, 'Bot disconnected — reconnecting');
  };

  const onReady = () => {
    state.status = 'connected';
    state.reconnectAttempts = 0;
    state.unstable = false;
    logger.info('Bot shard ready');
  };

  const onReconnecting = (shardId) => {
    state.status = 'reconnecting';
    logger.info({ shardId }, 'Bot shard reconnecting');
  };

  client.on(Events.ShardDisconnect, onDisconnect);
  client.on(Events.ShardReady, onReady);
  client.on(Events.ShardReconnecting, onReconnecting);
}

function stopMonitoring() {
  if (!_client) return;
  _client.removeAllListeners(Events.ShardDisconnect);
  _client.removeAllListeners(Events.ShardReady);
  _client.removeAllListeners(Events.ShardReconnecting);
  _client = null;
}

function getHealth() {
  return {
    status: state.status,
    uptime: state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0,
    reconnectAttempts: state.reconnectAttempts,
    lastDisconnect: state.lastDisconnect,
    unstable: state.unstable,
  };
}

module.exports = { startMonitoring, stopMonitoring, getHealth };
