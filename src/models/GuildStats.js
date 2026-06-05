const mongoose = require('mongoose');

const guildStatsSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    index: true,
  },
  guildName: {
    type: String,
    default: null,
  },
  memberCount: {
    type: Number,
    default: 0,
  },
  botCount: {
    type: Number,
    default: 0,
  },
  humanCount: {
    type: Number,
    default: 0,
  },
  channelCount: {
    type: Number,
    default: 0,
  },
  roleCount: {
    type: Number,
    default: 0,
  },
  voiceConnections: {
    type: Number,
    default: 0,
  },
  onlineCount: {
    type: Number,
    default: 0,
  },
  idleCount: {
    type: Number,
    default: 0,
  },
  dndCount: {
    type: Number,
    default: 0,
  },
  offlineCount: {
    type: Number,
    default: 0,
  },
  memberJoins: {
    type: Number,
    default: 0,
  },
  memberLeaves: {
    type: Number,
    default: 0,
  },
  voiceJoinCount: {
    type: Number,
    default: 0,
  },
  voiceLeaveCount: {
    type: Number,
    default: 0,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

guildStatsSchema.index({ guildId: 1, timestamp: -1 });
guildStatsSchema.index({ guildId: 1, createdAt: -1 });

guildStatsSchema.statics.recordStats = function (guildId, data) {
  return this.create({
    guildId,
    guildName: data.guildName || null,
    memberCount: data.memberCount || 0,
    botCount: data.botCount || 0,
    humanCount: data.humanCount || 0,
    channelCount: data.channelCount || 0,
    roleCount: data.roleCount || 0,
    voiceConnections: data.voiceConnections || 0,
    onlineCount: data.onlineCount || 0,
    idleCount: data.idleCount || 0,
    dndCount: data.dndCount || 0,
    offlineCount: data.offlineCount || 0,
    memberJoins: data.memberJoins || 0,
    memberLeaves: data.memberLeaves || 0,
    voiceJoinCount: data.voiceJoinCount || 0,
    voiceLeaveCount: data.voiceLeaveCount || 0,
  });
};

guildStatsSchema.statics.getGuildHistory = function (guildId, limit = 100) {
  return this.find({ guildId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

guildStatsSchema.statics.pruneOlderThan = function (days) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.deleteMany({ timestamp: { $lt: cutoff } });
};

module.exports = mongoose.model('GuildStats', guildStatsSchema);
