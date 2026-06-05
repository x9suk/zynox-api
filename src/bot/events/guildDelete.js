const cacheService = require('../../services/cache.service');
const logger = require('../../utils/logger');

async function guildDeleteHandler(guild) {
  try {
    logger.info({ guildId: guild.id, guildName: guild.name }, 'Bot removed from guild');

    await cacheService.deleteGuildStats(guild.id);
  } catch (err) {
    logger.error({ err, guildId: guild.id }, 'Error in guildDelete handler');
  }
}

module.exports = guildDeleteHandler;
