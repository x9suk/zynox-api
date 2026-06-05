const cacheService = require('../services/cache.service');
const { User, PresenceLog, BotStats, GuildStats } = require('../models');
const { NotFoundError, ValidationError } = require('../utils/errors');

const SNOWFLAKE_REGEX = /^\d{17,20}$/;

function validateSnowflake(id, label = 'ID') {
  if (!id || !SNOWFLAKE_REGEX.test(id)) {
    throw new ValidationError(`Invalid Discord ${label}. Must be a 17-20 digit snowflake.`);
  }
}

function formatResponse(data, cached = false, source = null) {
  return {
    success: true,
    data,
    cached,
    source: source || (cached ? 'redis' : 'mongodb'),
    timestamp: new Date().toISOString(),
  };
}

async function getPublicUser(req, res) {
  const { id } = req.params;
  validateSnowflake(id, 'user ID');

  let user = await cacheService.get(id);

  if (user) {
    return res.json(formatResponse(user, true, 'redis'));
  }

  user = await User.findByDiscordId(id);
  if (!user) {
    const cachedPresence = await cacheService.getUserPresence(id);
    if (cachedPresence) {
      return res.json(formatResponse({
        discordId: id,
        username: null,
        globalName: null,
        avatar: null,
        banner: null,
        bannerColor: null,
        bot: null,
        lastSeen: null,
        note: 'User profile not stored. Only presence data is cached.',
      }, true, 'redis'));
    }
    throw new NotFoundError('User not found. This user has not been tracked yet.');
  }

  const safe = {
    id: user.discordId,
    username: user.username,
    globalName: user.globalName,
    avatar: user.avatar,
    banner: user.banner,
    bannerColor: user.bannerColor,
    accentColor: user.accentColor,
    bot: user.bot,
    createdAt: user.createdAt,
    lastSeen: user.lastSeen,
  };

  await cacheService.set(id, safe, 600);

  res.json(formatResponse(safe, false, 'mongodb'));
}

async function getUserPresence(req, res) {
  const { id } = req.params;
  validateSnowflake(id, 'user ID');

  const presence = await cacheService.getUserPresence(id);
  if (presence) {
    return res.json(formatResponse(presence, true, 'redis'));
  }

  const history = await PresenceLog.getHistory(id, 1);
  if (history.length > 0) {
    const latest = history[0];
    return res.json(formatResponse({
      userId: latest.userId,
      guildId: latest.guildId,
      status: latest.status,
      activities: latest.activities,
      clientStatus: latest.clientStatus,
      afk: latest.afk,
      lastUpdated: latest.createdAt,
    }, false, 'mongodb'));
  }

  throw new NotFoundError('Presence data not found. This user may not be in any guild the bot tracks.');
}

async function getBotStats(req, res) {
  const { id } = req.params;
  validateSnowflake(id, 'bot ID');

  const cached = await cacheService.getBotStats(id);
  if (cached) {
    return res.json(formatResponse(cached, true, 'redis'));
  }

  const latest = await BotStats.getLatest();
  if (!latest) {
    throw new NotFoundError('Bot stats not available yet. The bot may still be starting up.');
  }

  res.json(formatResponse({
    botId: id,
    uptime: latest.uptime,
    ping: latest.ping,
    guildCount: latest.guildCount,
    userCount: latest.userCount,
    memberCount: latest.memberCount,
    channelCount: latest.channelCount,
    commandCount: latest.commandCount,
    voiceConnections: latest.voiceConnections,
    memoryUsage: latest.memoryUsage,
    timestamp: latest.timestamp,
  }, false, 'mongodb'));
}

async function getGuildStats(req, res) {
  const { id } = req.params;
  validateSnowflake(id, 'guild ID');

  const cached = await cacheService.getGuildStats(id);
  if (cached) {
    return res.json(formatResponse(cached, true, 'redis'));
  }

  const history = await GuildStats.getGuildHistory(id, 1);
  if (history.length === 0) {
    throw new NotFoundError('Guild stats not found. The bot may not be in this guild.');
  }

  const latest = history[0];
  res.json(formatResponse({
    guildId: latest.guildId,
    guildName: latest.guildName,
    memberCount: latest.memberCount,
    botCount: latest.botCount,
    humanCount: latest.humanCount,
    channelCount: latest.channelCount,
    roleCount: latest.roleCount,
    voiceConnections: latest.voiceConnections,
    onlineCount: latest.onlineCount,
    idleCount: latest.idleCount,
    dndCount: latest.dndCount,
    offlineCount: latest.offlineCount,
    timestamp: latest.timestamp,
  }, false, 'mongodb'));
}

async function getUserTimeline(req, res) {
  const { id } = req.params;
  validateSnowflake(id, 'user ID');

  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

  const history = await PresenceLog.getHistory(id, limit);
  if (history.length === 0) {
    throw new NotFoundError('No presence history found for this user.');
  }

  res.json(formatResponse(history, false, 'mongodb'));
}

async function getUsersBatch(req, res) {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ValidationError('ids must be a non-empty array');
  }
  if (ids.length > 100) {
    throw new ValidationError('Maximum 100 IDs per batch request');
  }
  for (const id of ids) {
    if (!SNOWFLAKE_REGEX.test(id)) {
      throw new ValidationError(`Invalid Discord ID: ${id}`);
    }
  }

  const results = await Promise.all(ids.map(async (id) => {
    let user = await cacheService.get(id);
    if (!user) {
      user = await User.findByDiscordId(id);
      if (user) {
        user = {
          id: user.discordId,
          username: user.username,
          globalName: user.globalName,
          avatar: user.avatar,
          banner: user.banner,
          bannerColor: user.bannerColor,
          accentColor: user.accentColor,
          bot: user.bot,
          createdAt: user.createdAt,
          lastSeen: user.lastSeen,
        };
        await cacheService.set(id, user, 600);
      }
    }
    return user || null;
  }));

  res.json(formatResponse(results));
}

async function getBotsBatch(req, res) {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ValidationError('ids must be a non-empty array');
  }
  if (ids.length > 100) {
    throw new ValidationError('Maximum 100 IDs per batch request');
  }

  const results = await Promise.all(ids.map(async (id) => {
    if (!SNOWFLAKE_REGEX.test(id)) return null;
    const cached = await cacheService.getBotStats(id);
    if (cached) return cached;
    const latest = await BotStats.getLatest();
    if (latest) {
      return {
        botId: id,
        uptime: latest.uptime,
        ping: latest.ping,
        guildCount: latest.guildCount,
        userCount: latest.userCount,
        memberCount: latest.memberCount,
        channelCount: latest.channelCount,
        commandCount: latest.commandCount,
        voiceConnections: latest.voiceConnections,
        memoryUsage: latest.memoryUsage,
        timestamp: latest.timestamp,
      };
    }
    return null;
  }));

  res.json(formatResponse(results));
}

async function getGuildsBatch(req, res) {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ValidationError('ids must be a non-empty array');
  }
  if (ids.length > 100) {
    throw new ValidationError('Maximum 100 IDs per batch request');
  }

  const results = await Promise.all(ids.map(async (id) => {
    if (!SNOWFLAKE_REGEX.test(id)) return null;
    const cached = await cacheService.getGuildStats(id);
    if (cached) return cached;
    const history = await GuildStats.getGuildHistory(id, 1);
    if (history.length > 0) {
      const latest = history[0];
      return {
        guildId: latest.guildId,
        guildName: latest.guildName,
        memberCount: latest.memberCount,
        botCount: latest.botCount,
        humanCount: latest.humanCount,
        channelCount: latest.channelCount,
        roleCount: latest.roleCount,
        voiceConnections: latest.voiceConnections,
        onlineCount: latest.onlineCount,
        idleCount: latest.idleCount,
        dndCount: latest.dndCount,
        offlineCount: latest.offlineCount,
        timestamp: latest.timestamp,
      };
    }
    return null;
  }));

  res.json(formatResponse(results));
}

module.exports = { getPublicUser, getUserPresence, getBotStats, getGuildStats, getUserTimeline, getUsersBatch, getBotsBatch, getGuildsBatch };
