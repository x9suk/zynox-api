const GuildStats = require('../../models/GuildStats');
const cacheService = require('../../services/cache.service');
const logger = require('../../utils/logger');

async function guildCreateHandler(guild) {
  try {
    logger.info({ guildId: guild.id, guildName: guild.name, memberCount: guild.memberCount }, 'Bot joined guild');

    const data = {
      guildName: guild.name,
      memberCount: guild.memberCount || 0,
      channelCount: guild.channels.cache.size,
      roleCount: guild.roles.cache.size,
      botCount: 0,
      humanCount: 0,
      onlineCount: 0,
      idleCount: 0,
      dndCount: 0,
      offlineCount: 0,
      voiceConnections: 0,
      memberJoins: 0,
      memberLeaves: 0,
      voiceJoinCount: 0,
      voiceLeaveCount: 0,
    };

    await cacheService.setGuildStats(guild.id, data);
    await GuildStats.recordStats(guild.id, data);
  } catch (err) {
    logger.error({ err, guildId: guild.id }, 'Error in guildCreate handler');
  }
}

module.exports = guildCreateHandler;
