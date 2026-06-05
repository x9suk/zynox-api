const { PresenceLog, User } = require('../../models');
const cacheService = require('../../services/cache.service');
const realtimeService = require('../../services/realtime.service');
const logger = require('../../utils/logger');

async function presenceUpdateHandler(oldPresence, newPresence) {
  try {
    const user = newPresence.user || oldPresence?.user;
    if (!user || user.bot) return;

    const guild = newPresence.guild || oldPresence?.guild;
    if (!guild) return;

    const discordId = user.id;
    const status = newPresence.status || 'offline';

    const activities = newPresence.activities?.map((a) => ({
      name: a.name,
      type: a.type,
      url: a.url || null,
      details: a.details || null,
      state: a.state || null,
      applicationId: a.applicationId || null,
      timestamps: {
        start: a.createdTimestamp || null,
        end: null,
      },
      party: a.party ? { id: a.party.id, size: a.party.size } : {},
      assets: a.assets ? {
        largeImage: a.assets.largeImage,
        largeText: a.assets.largeText,
        smallImage: a.assets.smallImage,
        smallText: a.assets.smallText,
      } : {},
      flags: a.flags?.bitfield ?? null,
      emoji: a.emoji ? {
        name: a.emoji.name,
        id: a.emoji.id,
        animated: a.emoji.animated,
      } : null,
      syncId: a.syncId || null,
      sessionId: a.sessionId || null,
    })) || [];

    const presenceData = {
      userId: discordId,
      guildId: guild.id,
      status,
      activities,
      clientStatus: {
        desktop: newPresence.clientStatus?.desktop || null,
        mobile: newPresence.clientStatus?.mobile || null,
        web: newPresence.clientStatus?.web || null,
      },
      afk: false,
      since: null,
    };

    await cacheService.setUserPresence(discordId, presenceData);

    realtimeService.emitPresenceUpdate(discordId, presenceData);

    if (user.globalName || user.username) {
      try {
        await User.upsertDiscordUser({
          id: discordId,
          username: user.username,
          global_name: user.globalName || user.username,
          avatar: user.avatar,
          banner: user.banner,
          bot: user.bot,
          discriminator: user.discriminator,
        });
      } catch (err) {
        logger.debug({ err, discordId }, 'Failed to upsert user from presence');
      }
    }

    setImmediate(async () => {
      try {
        await PresenceLog.logPresence(presenceData);
      } catch (err) {
        logger.error({ err, discordId }, 'Failed to log presence');
      }
    });
  } catch (err) {
    logger.error({ err }, 'Error in presenceUpdate handler');
  }
}

module.exports = presenceUpdateHandler;
