const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  name: { type: String },
  type: { type: Number },
  url: { type: String, default: null },
  details: { type: String, default: null },
  state: { type: String, default: null },
  applicationId: { type: String, default: null },
  timestamps: {
    start: { type: Number, default: null },
    end: { type: Number, default: null },
  },
  party: {
    id: { type: String, default: null },
    size: [Number],
  },
  assets: {
    largeImage: { type: String, default: null },
    largeText: { type: String, default: null },
    smallImage: { type: String, default: null },
    smallText: { type: String, default: null },
  },
  flags: { type: Number, default: null },
  emoji: {
    name: { type: String, default: null },
    id: { type: String, default: null },
    animated: { type: Boolean, default: null },
  },
  syncId: { type: String, default: null },
  sessionId: { type: String, default: null },
}, { _id: false });

const presenceLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  guildId: {
    type: String,
    default: null,
    index: true,
  },
  status: {
    type: String,
    enum: ['online', 'idle', 'dnd', 'offline'],
    required: true,
  },
  activities: {
    type: [activitySchema],
    default: [],
  },
  clientStatus: {
    desktop: { type: String, default: null },
    mobile: { type: String, default: null },
    web: { type: String, default: null },
  },
  afk: {
    type: Boolean,
    default: false,
  },
  since: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

presenceLogSchema.index({ userId: 1, createdAt: -1 });
presenceLogSchema.index({ guildId: 1, createdAt: -1 });
presenceLogSchema.index({ status: 1 });
presenceLogSchema.index({ createdAt: -1 });

presenceLogSchema.statics.logPresence = function (data) {
  return this.create({
    userId: data.userId,
    guildId: data.guildId || null,
    status: data.status || 'offline',
    activities: (data.activities || []).map((a) => ({
      name: a.name,
      type: a.type,
      url: a.url || null,
      details: a.details || null,
      state: a.state || null,
      applicationId: a.applicationId || null,
      timestamps: a.timestamps || {},
      party: a.party || {},
      assets: a.assets || {},
      flags: a.flags ?? null,
      emoji: a.emoji || null,
      syncId: a.syncId || null,
      sessionId: a.sessionId || null,
    })),
    clientStatus: {
      desktop: data.clientStatus?.desktop || null,
      mobile: data.clientStatus?.mobile || null,
      web: data.clientStatus?.web || null,
    },
    afk: data.afk || false,
    since: data.since ? new Date(data.since) : null,
  });
};

presenceLogSchema.statics.getHistory = function (userId, limit = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

presenceLogSchema.statics.pruneOlderThan = function (days) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.deleteMany({ createdAt: { $lt: cutoff } });
};

module.exports = mongoose.model('PresenceLog', presenceLogSchema);
