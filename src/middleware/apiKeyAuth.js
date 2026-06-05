const { ApiKey } = require('../models');
const { sha256 } = require('../utils/hash');
const rateLimitService = require('../services/rateLimit.service');
const abuseService = require('../services/abuse.service');
const { UnauthorizedError, ForbiddenError, RateLimitError } = require('../utils/errors');
const logger = require('../utils/logger');
const config = require('../config/env');
const { checkAndAlert } = require('../services/alert.service');

const publicPaths = [
  '/api/v1/health',
  '/api/v1/auth/discord/login',
  '/api/v1/auth/discord/callback',
];

function isDev() {
  return config.server.env === 'development';
}

function apiKeyAuth(options = {}) {
  const { required = true, scope } = options;

  return async (req, res, next) => {
    let authenticated = false;
    try {
      const isPublic = publicPaths.some((p) => req.path.startsWith(p));
      if (isPublic) return next();

      const apiKeyHeader = req.headers['x-api-key'];
      if (!apiKeyHeader) {
        if (!required) return next();
        throw new UnauthorizedError('Missing x-api-key header');
      }

      if (isDev()) logger.debug({ step: 1, exists: true }, 'x-api-key exists');

      const ip = req.ip || req.connection.remoteAddress || 'unknown';

      if (isDev()) logger.debug({ step: 2, prefix: apiKeyHeader.substring(0, 10) }, 'key prefix');

      const blocked = await abuseService.isIpBlocked(ip);
      if (blocked.blocked) {
        throw new ForbiddenError('IP is temporarily blocked');
      }

      const keyHash = sha256(apiKeyHeader);

      if (isDev()) logger.debug({ step: 3, hashStart: keyHash.substring(0, 12) }, 'SHA-256 hash generated');

      const keyDoc = await ApiKey.findOne({ keyHash })
        .populate('developer')
        .lean();

      if (isDev()) logger.debug({ step: 4, found: !!keyDoc }, 'ApiKey lookup');

      if (!keyDoc) {
        await abuseService.recordFailedAuth(ip, apiKeyHeader.substring(0, 10));
        throw new UnauthorizedError('Invalid API key');
      }

      if (isDev()) logger.debug({
        step: 5, isActive: keyDoc.isActive, expiresAt: keyDoc.expiresAt,
      }, 'key status');

      if (!keyDoc.isActive) {
        await abuseService.recordFailedAuth(ip, keyDoc.keyPrefix);
        throw new ForbiddenError('API key is disabled');
      }

      if (keyDoc.expiresAt && new Date(keyDoc.expiresAt) < new Date()) {
        await abuseService.recordFailedAuth(ip, keyDoc.keyPrefix);
        throw new ForbiddenError('API key has expired');
      }

      const developer = keyDoc.developer;

      if (isDev()) logger.debug({ step: 7, developerPopulated: !!developer }, 'developer');

      if (!developer) {
        throw new ForbiddenError('API key owner not found');
      }

      if (isDev()) logger.debug({ step: 8, isBanned: developer.isBanned }, 'developer banned status');

      if (developer.isBanned) {
        throw new ForbiddenError('Account is banned');
      }

      const endpointScope = scope || extractScopeFromPath(req.path);

      if (isDev()) logger.debug({ step: '9-10', requiredScope: endpointScope, keyScopes: keyDoc.scopes }, 'scope check');

      if (endpointScope && !keyDoc.scopes.includes(endpointScope) && !keyDoc.scopes.includes('*')) {
        await abuseService.recordSuspiciousRequest(ip, `scope_mismatch:${endpointScope}`);
        throw new ForbiddenError(`API key does not have required scope: ${endpointScope}`);
      }

      authenticated = true;

      const dailyCheck = await rateLimitService.checkDaily(String(keyDoc._id), keyDoc.dailyLimit);
      res.setHeader('X-Daily-Limit', dailyCheck.limit);
      res.setHeader('X-Daily-Remaining', dailyCheck.remaining);
      res.setHeader('X-Daily-Used', dailyCheck.used);

      if (isDev()) logger.debug({ step: 11, dailyRemaining: dailyCheck.remaining, dailyLimit: dailyCheck.limit }, 'daily limit');

      if (dailyCheck.remaining <= 0) {
        throw new RateLimitError('Daily request limit reached for this API key');
      }

      const perMinuteCheck = await rateLimitService.checkKey(
        String(keyDoc._id),
        keyDoc.rateLimitPerMinute,
        60000,
      );
      res.setHeader('X-RateLimit-Limit', perMinuteCheck.limit);
      res.setHeader('X-RateLimit-Remaining', perMinuteCheck.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(perMinuteCheck.resetAt / 1000));

      if (isDev()) logger.debug({ step: 12, perMinuteRemaining: perMinuteCheck.remaining, perMinuteLimit: perMinuteCheck.limit }, 'per-minute limit');

      if (perMinuteCheck.remaining <= 0) {
        throw new RateLimitError('API key rate limit exceeded');
      }

      if (isDev()) logger.debug({ step: '12b', action: 'incrementDaily' }, 'post-rate-limit checks');

      await rateLimitService.incrementDaily(String(keyDoc._id));

      if (isDev()) logger.debug({ step: '12c', action: 'incrementDaily', status: 'ok' }, 'daily counter updated');

      checkAndAlert(String(keyDoc._id), String(developer._id), dailyCheck.used + 1, keyDoc.dailyLimit).catch(() => {});

      if (isDev()) logger.debug({ step: '12d', action: 'findByIdAndUpdate' }, 'updating lastUsedAt');

      await ApiKey.findByIdAndUpdate(keyDoc._id, {
        lastUsedAt: new Date(),
        lastIp: ip,
      });

      if (isDev()) logger.debug({ step: '12e', action: 'findByIdAndUpdate', status: 'ok' }, 'key updated');

      if (isDev()) logger.debug({ step: '12f' }, 'assigning req.apiKey');

      req.apiKey = {
        id: keyDoc._id,
        name: keyDoc.name,
        keyPrefix: keyDoc.keyPrefix,
        plan: keyDoc.plan,
        scopes: keyDoc.scopes,
        dailyLimit: keyDoc.dailyLimit,
        rateLimitPerMinute: keyDoc.rateLimitPerMinute,
        webhookUrl: keyDoc.webhookUrl,
      };

      if (isDev()) logger.debug({ step: '12g' }, 'assigning req.developer');

      req.developer = {
        id: developer._id,
        discordId: developer.discordId,
        username: developer.username,
        globalName: developer.globalName,
        avatar: developer.avatar,
        email: developer.email,
        role: developer.role,
        plan: developer.plan,
      };

      if (isDev()) logger.debug({ step: '12h', keyPrefix: keyDoc.keyPrefix, plan: keyDoc.plan }, 'auth success, calling next()');

      next();
    } catch (err) {
      if (isDev()) logger.debug({
        step: 13,
        errorName: err.name,
        errorMessage: err.message,
        errorStack: err.stack,
      }, 'auth failure details');

      if (err.status) {
        next(err);
      } else if (authenticated) {
        logger.error({ err, keyPrefix: keyDoc?.keyPrefix }, 'Internal error after key authentication passed');
        next(Object.assign(new Error('Internal server error'), { status: 500 }));
      } else {
        logger.error({ err }, 'API key auth error');
        next(new UnauthorizedError('Authentication failed'));
      }
    }
  };
}

function extractScopeFromPath(path) {
  const publicPatterns = [
    { pattern: /^\/public\/users\/([^/]+)$/, scope: 'users:read' },
    { pattern: /^\/public\/users\/batch$/, scope: 'users:read' },
    { pattern: /^\/public\/users\/([^/]+)\/presence$/, scope: 'presence:read' },
    { pattern: /^\/public\/bots\/([^/]+)\/stats$/, scope: 'bot:read' },
    { pattern: /^\/public\/bots\/batch$/, scope: 'bot:read' },
    { pattern: /^\/public\/guilds\/([^/]+)\/stats$/, scope: 'guilds:read' },
    { pattern: /^\/public\/guilds\/batch$/, scope: 'guilds:read' },
  ];

  for (const { pattern, scope } of publicPatterns) {
    if (pattern.test(path)) return scope;
  }
  return null;
}

function requireScope(scope) {
  return (req, res, next) => {
    if (!req.apiKey) return next(new UnauthorizedError('API key required'));
    if (!req.apiKey.scopes.includes(scope) && !req.apiKey.scopes.includes('*')) {
      return next(new ForbiddenError(`Missing required scope: ${scope}`));
    }
    next();
  };
}

module.exports = { apiKeyAuth, requireScope };
