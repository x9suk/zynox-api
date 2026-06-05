const webhookService = require('./webhook.service');

let io = null;

function setIO(instance) {
  io = instance;
}

function getIO() {
  return io;
}

const realtimeService = {
  setIO,
  getIO,

  emitPresenceUpdate(userId, data) {
    if (!io) return;
    io.to('presence:all').emit('presence:update', { userId, data, timestamp: new Date().toISOString() });
    webhookService.deliverToAllKeys('presence:update', { userId, data }).catch(() => {});
  },

  emitBotStatsUpdate(botId, data) {
    if (!io) return;
    io.to('bot:all').emit('bot:stats:update', { botId, data, timestamp: new Date().toISOString() });
    webhookService.deliverToAllKeys('bot:stats:update', { botId, data }).catch(() => {});
  },

  emitGuildStatsUpdate(guildId, data) {
    if (!io) return;
    io.to(`guild:${guildId}`).emit('guild:stats:update', { guildId, data, timestamp: new Date().toISOString() });
    webhookService.deliverToAllKeys('guild:stats:update', { guildId, data }).catch(() => {});
  },

  emitVoiceUpdate(guildId, userId, data) {
    if (!io) return;
    io.to(`guild:${guildId}`).emit('voice:update', { guildId, userId, data, timestamp: new Date().toISOString() });
    webhookService.deliverToAllKeys('voice:update', { guildId, userId, data }).catch(() => {});
  },

  emitGuildMemberUpdate(guildId, userId, action, data) {
    if (!io) return;
    io.to(`guild:${guildId}`).emit('guild:member:update', {
      guildId, userId, action, data, timestamp: new Date().toISOString(),
    });
    webhookService.deliverToAllKeys('guild:member:update', { guildId, userId, action, data }).catch(() => {});
  },
};

module.exports = realtimeService;
