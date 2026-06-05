const config = require('../config/env');
const abuseService = require('../services/abuse.service');
const rateLimitService = require('../services/rateLimit.service');


const store = new Map();
const interval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 30000);
interval.unref();

async function rateLimiter(req, res, next) {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';

    try {
      const blocked = await abuseService.isIpBlocked(ip);
      if (blocked.blocked) {
        const retryAfter = 900;
        res.setHeader('Retry-After', retryAfter);
        return res.status(429).json({
          error: true,
          message: 'IP temporarily blocked due to suspicious activity',
          retryAfter,
        });
      }
    } catch {
      // Redis unavailable — skip IP block check
    }

    const { max, windowMs } = config.rateLimit;
    let entry = store.get(ip);

    if (!entry || entry.resetAt <= Date.now()) {
      if (!entry) {
        try {
          const result = await rateLimitService.checkIp(ip, max, windowMs);
          entry = { count: result.used, limit: result.limit, resetAt: Date.now() + windowMs };
        } catch {
          entry = { count: 1, limit: max, resetAt: Date.now() + windowMs };
        }
      } else {
        entry = { count: 1, limit: max, resetAt: Date.now() + windowMs };
      }
      store.set(ip, entry);
    } else {
      entry.count += 1;
    }
    const remaining = Math.max(0, entry.limit - entry.count);
    const resetAt = Math.ceil(entry.resetAt / 1000);

    res.setHeader('X-RateLimit-Limit', entry.limit);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetAt);

    if (entry.count > entry.limit) {
      try {
        await abuseService.recordSuspiciousRequest(ip, 'ip_rate_limit_exceeded');
      } catch {
        // Redis unavailable — skip recording
      }
      return res.status(429).json({
        error: true,
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil((entry.resetAt - Date.now()) / 1000),
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = rateLimiter;
