const { GuildStats } = require('../../models');
const cacheService = require('../../services/cache.service');
const realtimeService = require('../../services/realtime.service');
const { cacheSingleGuildStats } = require('./ready');
const logger = require('../../utils/logger');

async function guildMemberAddHandler(member) {
  try {
    if (member.user.bot) return;

    const guild = member.guild;
    logger.debug({ guildId: guild.id, userId: member.id }, 'Member joined guild');

    await GuildStats.findOneAndUpdate(
      { guildId: guild.id },
      {
        $inc: { memberJoins: 1 },
        $set: { timestamp: new Date() },
      },
      { sort: { timestamp: -1 } },
    );

    const cached = await cacheService.getGuildMemberCounts(guild.id);
    if (cached) {
      cached.humanCount = (cached.humanCount || 0) + 1;
      cached.memberCount = (cached.memberCount || 0) + 1;
      await cacheService.setGuildMemberCounts(guild.id, cached);
    }

    await cacheSingleGuildStats(guild, member.client);

    realtimeService.emitGuildMemberUpdate(guild.id, member.id, 'join', {
      userId: member.id,
      username: member.user?.username,
      joinedAt: new Date(),
    });
  } catch (err) {
    logger.error({ err, guildId: member.guild?.id }, 'Error in guildMemberAdd handler');
  }
}

module.exports = guildMemberAddHandler;
