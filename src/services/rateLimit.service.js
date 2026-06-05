const { getRedis } = require('../config/redis');
const config = require('../config/env');

const p = config.redis.prefix;

const rateLimitService = {
  async checkKey(keyId, max, windowMs) {
    const redis = await getRedis();
    const redisKey = `${p}ratelimit:apikey:${keyId}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    const multi = redis.multi();
    multi.zRemRangeByScore(redisKey, 0, windowStart);
    multi.zCard(redisKey);
    multi.zAdd(redisKey, { score: now, value: `${now}:${Math.random()}` });
    multi.expire(redisKey, Math.ceil(windowMs / 1000) + 1);

    const results = await multi.exec();
    const count = results[1];
    const remaining = Math.max(0, max - count);

    return { limit: max, remaining, used: count, resetAt: now + windowMs };
  },

  async checkDaily(keyId, dailyLimit) {
    const redis = await getRedis();
    const today = new Date().toISOString().slice(0, 10);
    const redisKey = `${p}ratelimit:daily:${keyId}`;

    const current = await redis.hGet(redisKey, today);
    const used = current ? parseInt(current, 10) : 0;
    const remaining = Math.max(0, dailyLimit - used);

    const ttl = await redis.ttl(redisKey);
    if (ttl < 0) {
      const nextMidnight = new Date();
      nextMidnight.setUTCHours(24, 0, 0, 0);
      const secondsUntilMidnight = Math.floor((nextMidnight - new Date()) / 1000);
      await redis.expire(redisKey, secondsUntilMidnight);
    }

    return { limit: dailyLimit, used, remaining, date: today };
  },

  async incrementDaily(keyId) {
    const redis = await getRedis();
    const today = new Date().toISOString().slice(0, 10);
    const redisKey = `${p}ratelimit:daily:${keyId}`;

    const used = await redis.hIncrBy(redisKey, today, 1);

    const ttl = await redis.ttl(redisKey);
    if (ttl < 0) {
      const nextMidnight = new Date();
      nextMidnight.setUTCHours(24, 0, 0, 0);
      const secondsUntilMidnight = Math.floor((nextMidnight - new Date()) / 1000);
      await redis.expire(redisKey, secondsUntilMidnight);
    }

    return used;
  },

  async resetDaily(keyId) {
    const redis = await getRedis();
    const redisKey = `${p}ratelimit:daily:${keyId}`;
    await redis.del(redisKey);
  },

  async checkIp(ip, max, windowMs) {
    const redis = await getRedis();
    const redisKey = `${p}ratelimit:ip:${ip}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    const multi = redis.multi();
    multi.zRemRangeByScore(redisKey, 0, windowStart);
    multi.zCard(redisKey);
    multi.zAdd(redisKey, { score: now, value: `${now}:${Math.random()}` });
    multi.expire(redisKey, Math.ceil(windowMs / 1000) + 1);

    const results = await multi.exec();
    const count = results[1];
    const remaining = Math.max(0, max - count);

    return { limit: max, remaining, used: count };
  },

  async getKeyUsage(keyId) {
    const redis = await getRedis();
    const key = `${p}ratelimit:apikey:${keyId}`;
    const count = await redis.zCard(key);
    let oldestTimestamp = null;
    if (count > 0) {
      const oldest = await redis.zRange(key, 0, 0, { WITHSCORES: true });
      if (oldest.length > 0) {
        oldestTimestamp = parseInt(oldest[0].score, 10);
      }
    }
    return { count, oldestTimestamp };
  },

  async getDailyUsage(keyId) {
    const redis = await getRedis();
    const today = new Date().toISOString().slice(0, 10);
    const redisKey = `${p}ratelimit:daily:${keyId}`;
    const current = await redis.hGet(redisKey, today);
    return { used: current ? parseInt(current, 10) : 0, date: today };
  },

  async resetKey(keyId) {
    const redis = await getRedis();
    const keys = await redis.keys(`${p}ratelimit:*:${keyId}`);
    if (keys.length) await redis.del(keys);
  },
};

module.exports = rateLimitService;
