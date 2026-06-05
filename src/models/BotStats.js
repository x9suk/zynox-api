const mongoose = require('mongoose');

const botStatsSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  uptime: {
    type: Number,
    required: true,
  },
  ping: {
    type: Number,
    required: true,
  },
  guildCount: {
    type: Number,
    required: true,
  },
  userCount: {
    type: Number,
    required: true,
  },
  memberCount: {
    type: Number,
    default: 0,
  },
  channelCount: {
    type: Number,
    default: 0,
  },
  commandCount: {
    type: Number,
    default: 0,
  },
  voiceConnections: {
    type: Number,
    default: 0,
  },
  shardId: {
    type: Number,
    default: 0,
  },
  shardCount: {
    type: Number,
    default: 1,
  },
  memoryUsage: {
    rss: { type: Number, default: 0 },
    heapTotal: { type: Number, default: 0 },
    heapUsed: { type: Number, default: 0 },
    external: { type: Number, default: 0 },
  },
  cpuUsage: {
    user: { type: Number, default: 0 },
    system: { type: Number, default: 0 },
  },
  version: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

botStatsSchema.index({ timestamp: -1 });
botStatsSchema.index({ createdAt: -1 });

botStatsSchema.statics.recordStats = function (stats) {
  return this.create({
    uptime: stats.uptime,
    ping: stats.ping,
    guildCount: stats.guildCount,
    userCount: stats.userCount,
    memberCount: stats.memberCount || 0,
    channelCount: stats.channelCount || 0,
    commandCount: stats.commandCount || 0,
    voiceConnections: stats.voiceConnections || 0,
    shardId: stats.shardId || 0,
    shardCount: stats.shardCount || 1,
    memoryUsage: stats.memoryUsage || {},
    cpuUsage: stats.cpuUsage || {},
    version: stats.version || null,
  });
};

botStatsSchema.statics.getLatest = function () {
  return this.findOne().sort({ timestamp: -1 }).lean();
};

botStatsSchema.statics.getHistory = function (limit = 100) {
  return this.find()
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

botStatsSchema.statics.pruneOlderThan = function (days) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.deleteMany({ timestamp: { $lt: cutoff } });
};

module.exports = mongoose.model('BotStats', botStatsSchema);
