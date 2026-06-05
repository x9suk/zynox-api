const mongoose = require('mongoose');

const developerSchema = new mongoose.Schema({
  discordId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  username: {
    type: String,
    required: true,
  },
  globalName: {
    type: String,
    default: null,
  },
  avatar: {
    type: String,
    default: null,
  },
  email: {
    type: String,
    default: null,
  },
  locale: {
    type: String,
    default: null,
  },
  mfaEnabled: {
    type: Boolean,
    default: false,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    enum: ['developer', 'admin', 'superadmin'],
    default: 'developer',
  },
  plan: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free',
  },
  isBanned: {
    type: Boolean,
    default: false,
  },
  banReason: {
    type: String,
    default: null,
  },
  abuseFlags: [{
    type: {
      type: String,
      enum: ['rate_abuse', 'suspicious_ip', 'invalid_keys', 'scraping', 'other'],
    },
    reason: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  abuseScore: {
    type: Number,
    default: 0,
  },
  lastLoginAt: {
    type: Date,
    default: null,
  },
  apiKeyCount: {
    type: Number,
    default: 0,
  },
  maxApiKeys: {
    type: Number,
    default: 5,
  },
  dailyUsage: {
    count: { type: Number, default: 0 },
    date: { type: String, default: null },
  },
}, {
  timestamps: true,
});

developerSchema.index({ email: 1 }, { sparse: true });
developerSchema.index({ plan: 1 });
developerSchema.index({ isBanned: 1 });
developerSchema.index({ abuseScore: -1 });

developerSchema.statics.upsertFromDiscord = async function (discordUser) {
  const update = {
    discordId: discordUser.id,
    username: discordUser.username,
    globalName: discordUser.global_name || null,
    avatar: discordUser.avatar || null,
    email: discordUser.email || null,
    locale: discordUser.locale || null,
    mfaEnabled: discordUser.mfa_enabled || false,
    verified: discordUser.verified || false,
    lastLoginAt: new Date(),
  };

  return this.findOneAndUpdate(
    { discordId: discordUser.id },
    { $set: update, $setOnInsert: { plan: 'free', role: 'developer' } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

developerSchema.statics.findByDiscordId = function (discordId) {
  return this.findOne({ discordId }).lean();
};

developerSchema.methods.isActive = function () {
  return !this.isBanned;
};

developerSchema.methods.getPlanLimits = function () {
  const limits = {
    free: { dailyLimit: 100, maxKeys: 5, scopes: ['users:read', 'bot:read'] },
    pro: { dailyLimit: 10000, maxKeys: 25, scopes: ['users:read', 'bot:read', 'guilds:read', 'presence:read'] },
    enterprise: { dailyLimit: 100000, maxKeys: 100, scopes: ['*'] },
  };
  return limits[this.plan] || limits.free;
};

developerSchema.methods.incrementUsage = async function () {
  const today = new Date().toISOString().slice(0, 10);
  if (this.dailyUsage.date !== today) {
    this.dailyUsage = { count: 0, date: today };
  }
  this.dailyUsage.count += 1;
  return this.save();
};

developerSchema.methods.canMakeRequest = function () {
  if (this.isBanned) return { allowed: false, reason: 'Account banned' };
  const limits = this.getPlanLimits();
  const today = new Date().toISOString().slice(0, 10);
  const used = this.dailyUsage.date === today ? this.dailyUsage.count : 0;
  if (used >= limits.dailyLimit) {
    return { allowed: false, reason: 'Daily limit reached', limit: limits.dailyLimit, used };
  }
  return { allowed: true, limit: limits.dailyLimit, used };
};

developerSchema.statics.getPlanDefaults = function (plan) {
  const plans = {
    free: { dailyLimit: 100, maxKeys: 5, webhook: false, cacheTier: 'standard' },
    pro: { dailyLimit: 10000, maxKeys: 25, webhook: false, cacheTier: 'fast' },
    enterprise: { dailyLimit: 100000, maxKeys: 100, webhook: true, cacheTier: 'priority' },
  };
  return plans[plan] || plans.free;
};

developerSchema.methods.toSafe = function () {
  return {
    id: this._id,
    discordId: this.discordId,
    username: this.username,
    globalName: this.globalName,
    avatar: this.avatar,
    email: this.email,
    role: this.role,
    plan: this.plan,
    isBanned: this.isBanned,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
    maxApiKeys: this.maxApiKeys,
    dailyUsage: this.dailyUsage,
  };
};

module.exports = mongoose.model('Developer', developerSchema);
