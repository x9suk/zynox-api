const cacheService = require('../../services/cache.service');
const realtimeService = require('../../services/realtime.service');
const { cacheSingleGuildStats } = require('./ready');
const logger = require('../../utils/logger');

async function voiceStateUpdateHandler(oldState, newState) {
  try {
    const guild = newState.guild || oldState.guild;
    if (!guild) return;

    const userId = newState.id || oldState.id;
    const userName = newState.member?.user?.username || oldState.member?.user?.username || 'unknown';

    const wasInVoice = oldState.channelId !== null && oldState.channelId !== undefined;
    const isInVoice = newState.channelId !== null && newState.channelId !== undefined;

    if (!wasInVoice && isInVoice) {
      logger.debug({ guildId: guild.id, userId, channelId: newState.channelId, userName }, 'User joined voice');

      const voiceData = {
        userId,
        userName,
        channelId: newState.channelId,
        channelName: newState.channel?.name || null,
        joinedAt: Date.now(),
        deaf: newState.deaf || false,
        mute: newState.mute || false,
        selfDeaf: newState.selfDeaf || false,
        selfMute: newState.selfMute || false,
        streaming: newState.streaming || false,
      };

      await cacheService.setVoiceState(guild.id, userId, voiceData);
      realtimeService.emitVoiceUpdate(guild.id, userId, { action: 'join', ...voiceData });
    }

    if (wasInVoice && !isInVoice) {
      logger.debug({ guildId: guild.id, userId, userName }, 'User left voice');

      await cacheService.deleteVoiceState(guild.id, userId);
      realtimeService.emitVoiceUpdate(guild.id, userId, { action: 'leave', userId, userName, leftAt: Date.now() });
    }

    if (wasInVoice && isInVoice && oldState.channelId !== newState.channelId) {
      await cacheService.deleteVoiceState(guild.id, userId);

      const voiceData = {
        userId,
        userName,
        channelId: newState.channelId,
        channelName: newState.channel?.name || null,
        joinedAt: Date.now(),
        deaf: newState.deaf || false,
        mute: newState.mute || false,
        selfDeaf: newState.selfDeaf || false,
        selfMute: newState.selfMute || false,
        streaming: newState.streaming || false,
      };

      await cacheService.setVoiceState(guild.id, userId, voiceData);
      realtimeService.emitVoiceUpdate(guild.id, userId, { action: 'move', ...voiceData });
    }

    setImmediate(async () => {
      try {
        await cacheSingleGuildStats(guild, newState.client || oldState.client);
      } catch (err) {
        logger.debug({ err }, 'Failed to update guild stats after voice change');
      }
    });
  } catch (err) {
    logger.error({ err }, 'Error in voiceStateUpdate handler');
  }
}

module.exports = voiceStateUpdateHandler;
