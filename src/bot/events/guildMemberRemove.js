const { GuildStats } = require('../../models');
const realtimeService = require('../../services/realtime.service');
const { cacheSingleGuildStats } = require('./ready');
const logger = require('../../utils/logger');

async function guildMemberRemoveHandler(member) {
  try {
    if (member.user?.bot) return;

    const guild = member.guild;
    if (!guild) return;

    logger.debug({ guildId: guild.id, userId: member.id }, 'Member left guild');

    await GuildStats.findOneAndUpdate(
      { guildId: guild.id },
      {
        $inc: { memberLeaves: 1 },
        $set: { timestamp: new Date() },
      },
      { sort: { timestamp: -1 } },
    );

    await cacheSingleGuildStats(guild, member.client);

    realtimeService.emitGuildMemberUpdate(guild.id, member.id, 'leave', {
      userId: member.id,
      username: member.user?.username,
      leftAt: new Date(),
    });
  } catch (err) {
    logger.error({ err, guildId: member.guild?.id }, 'Error in guildMemberRemove handler');
  }
}

module.exports = guildMemberRemoveHandler;
