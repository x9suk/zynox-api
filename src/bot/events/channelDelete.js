const { cacheSingleGuildStats } = require('./ready');
const logger = require('../../utils/logger');

async function channelDeleteHandler(channel) {
  if (!channel.guild) return;

  try {
    await cacheSingleGuildStats(channel.guild, channel.client);
  } catch (err) {
    logger.error({ err, guildId: channel.guild.id }, 'Error in channelDelete handler');
  }
}

module.exports = channelDeleteHandler;
