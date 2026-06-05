const { getRedis } = require('../../config/redis');
const config = require('../../config/env');
const cacheService = require('../../services/cache.service');
const GuildStats = require('../../models/GuildStats');
const logger = require('../../utils/logger');

const p = config.redis.prefix;

async function guildEmojisUpdateHandler(guild) {
  try {
    const redis = await getRedis();
    const debounceKey = `${p}debounce:emojis:${guild.id}`;
    const recent = await redis.get(debounceKey);
    if (recent) return;
    await redis.setEx(debounceKey, 30, '1');

    const emojiCount = guild.emojis.cache.size;
    const data = {
      guildName: guild.name,
      memberCount: guild.memberCount || 0,
      channelCount: guild.channels.cache.size,
      roleCount: guild.roles.cache.size,
      emojiCount,
    };

    const existing = await cacheService.getGuildStats(guild.id) || {};
    Object.assign(existing, data);
    await cacheService.setGuildStats(guild.id, existing);

    await GuildStats.recordStats(guild.id, data);
    logger.debug({ guildId: guild.id, emojiCount }, 'Emoji count updated');
  } catch (err) {
    logger.error({ err, guildId: guild.id }, 'Error in guildEmojisUpdate handler');
  }
}

module.exports = guildEmojisUpdateHandler;
