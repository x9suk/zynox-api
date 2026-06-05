const { createClient } = require('redis');
const config = require('./env');
const logger = require('../utils/logger');

let client = null;

function createRedisClient() {
  const { host, port, password, username, tlsEnabled } = config.redis;

  const c = createClient({
    username: username || undefined,
    password: password || undefined,
    socket: {
      host,
      port,
      tls: tlsEnabled,
      connectTimeout: 2000,
      reconnectStrategy(retries) {
        if (retries > 1) return new Error('Max reconnection attempts');
        return Math.min(retries * 200, 1000);
      },
    },
  });

  c.on('connect', () => {
    logger.info('Redis connecting...');
  });

  c.on('ready', () => {
    logger.info(`Redis connected on ${host}:${port}`);
  });

  c.on('error', (err) => {
    logger.error({ err }, 'Redis error');
  });

  c.on('end', () => {
    logger.warn('Redis connection closed');
  });

  c.on('reconnecting', () => {
    logger.info('Redis reconnecting...');
  });

  return c;
}

async function getRedis() {
  if (!client) {
    client = createRedisClient();
    await client.connect();
  }
  return client;
}

async function redisSet(key, value, ttlSeconds = 300) {
  const fullKey = `${config.redis.prefix}${key}`;
  const data = typeof value === 'object' ? JSON.stringify(value) : String(value);
  const c = await getRedis();
  if (ttlSeconds > 0) {
    await c.setEx(fullKey, ttlSeconds, data);
  } else {
    await c.set(fullKey, data);
  }
  return true;
}

async function redisGet(key) {
  const fullKey = `${config.redis.prefix}${key}`;
  const c = await getRedis();
  const data = await c.get(fullKey);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

async function redisDel(key) {
  const fullKey = `${config.redis.prefix}${key}`;
  const c = await getRedis();
  await c.del(fullKey);
}

async function redisTTL(key) {
  const fullKey = `${config.redis.prefix}${key}`;
  const c = await getRedis();
  return c.ttl(fullKey);
}

module.exports = { getRedis, redisSet, redisGet, redisDel, redisTTL };
