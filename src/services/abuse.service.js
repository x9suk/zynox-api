const { getRedis } = require('../config/redis');
const config = require('../config/env');
const logger = require('../utils/logger');

const p = config.redis.prefix;

const ABUSE_THRESHOLDS = {
  FAILED_AUTH_LIMIT: config.abuse.failedAuthLimit,
  FAILED_AUTH_WINDOW: config.abuse.failedAuthWindow,
  IP_BLOCK_THRESHOLD: config.abuse.ipBlockThreshold,
  IP_BLOCK_DURATION: config.abuse.ipBlockDuration,
  SUSPICIOUS_SCORE_LIMIT: config.abuse.suspiciousScoreLimit,
  SUSPICIOUS_WINDOW: config.abuse.suspiciousWindow,
};

const abuseService = {
  async recordFailedAuth(ip, apiKeyPrefix = null) {
    const redis = await getRedis();
    const key = `${p}abuse:failed:${ip}`;
    const now = Date.now();
    const windowMs = ABUSE_THRESHOLDS.FAILED_AUTH_WINDOW * 1000;

    const multi = redis.multi();
    multi.zRemRangeByScore(key, 0, now - windowMs);
    multi.zAdd(key, { score: now, value: `${now}:${apiKeyPrefix || 'unknown'}` });
    multi.expire(key, ABUSE_THRESHOLDS.FAILED_AUTH_WINDOW + 60);
    multi.zCard(key);
    const results = await multi.exec();
    const count = results[3];

    logger.warn({ ip, apiKeyPrefix, count }, 'Failed auth attempt recorded');

    if (count >= ABUSE_THRESHOLDS.FAILED_AUTH_LIMIT) {
      await abuseService.tempBlockIp(ip, 'too_many_failed_auth');
    }

    return count;
  },

  async tempBlockIp(ip, reason = 'abuse') {
    const redis = await getRedis();
    const key = `${p}abuse:blocked:${ip}`;
    await redis.setEx(key, ABUSE_THRESHOLDS.IP_BLOCK_DURATION, reason);
    logger.warn({ ip, reason, duration: ABUSE_THRESHOLDS.IP_BLOCK_DURATION }, 'IP temporarily blocked');
  },

  async isIpBlocked(ip) {
    const redis = await getRedis();
    const key = `${p}abuse:blocked:${ip}`;
    const result = await redis.get(key);
    return result ? { blocked: true, reason: result } : { blocked: false };
  },

  async recordSuspiciousRequest(ip, reason) {
    const redis = await getRedis();
    const key = `${p}abuse:suspicious:${ip}`;
    const now = Date.now();
    const windowMs = ABUSE_THRESHOLDS.SUSPICIOUS_WINDOW * 1000;

    const multi = redis.multi();
    multi.zRemRangeByScore(key, 0, now - windowMs);
    multi.zAdd(key, { score: now, value: `${now}:${reason}` });
    multi.expire(key, ABUSE_THRESHOLDS.SUSPICIOUS_WINDOW + 60);
    multi.zCard(key);
    const results = await multi.exec();
    const count = results[3];

    logger.warn({ ip, reason, score: count }, 'Suspicious request recorded');

    if (count >= ABUSE_THRESHOLDS.SUSPICIOUS_SCORE_LIMIT) {
      await abuseService.tempBlockIp(ip, 'high_suspicion_score');
    }

    return { score: count, threshold: ABUSE_THRESHOLDS.SUSPICIOUS_SCORE_LIMIT };
  },

  async getAbuseStatus(ip) {
    const redis = await getRedis();
    const blockKey = `${p}abuse:blocked:${ip}`;
    const failedKey = `${p}abuse:failed:${ip}`;
    const suspKey = `${p}abuse:suspicious:${ip}`;

    const [blocked, failedCount, suspCount] = await Promise.all([
      redis.get(blockKey),
      redis.zCard(failedKey),
      redis.zCard(suspKey),
    ]);

    return {
      ip,
      blocked: !!blocked,
      blockReason: blocked || null,
      failedAuthCount: failedCount || 0,
      suspiciousScore: suspCount || 0,
    };
  },

  async clearAbuseData(ip) {
    const redis = await getRedis();
    const keys = await redis.keys(`${p}abuse:*:${ip}`);
    if (keys.length) {
      await redis.del(keys);
    }
    logger.info({ ip, cleared: keys.length }, 'Abuse data cleared');
    return keys.length;
  },

  async resetDeveloperAbuse(developerId) {
    const { Developer } = require('../models');
    await Developer.findByIdAndUpdate(developerId, {
      abuseScore: 0,
      abuseFlags: [],
    });
  },
};

module.exports = abuseService;
