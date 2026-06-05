const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  developer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Developer',
    required: true,
    index: true,
  },
  plan: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'incomplete', 'trialing', 'expired'],
    default: 'active',
  },
  dailyLimit: {
    type: Number,
    required: true,
  },
  maxKeys: {
    type: Number,
    default: 5,
  },
  scopes: {
    type: [String],
    default: ['users:read', 'bot:read'],
  },
  cacheTier: {
    type: String,
    enum: ['standard', 'fast', 'priority'],
    default: 'standard',
  },
  webhookEnabled: {
    type: Boolean,
    default: false,
  },
  webhookUrl: {
    type: String,
    default: null,
  },
  provider: {
    type: String,
    enum: ['stripe', 'patreon', 'guilded', 'manual', 'none'],
    default: 'none',
  },
  providerCustomerId: {
    type: String,
    default: null,
  },
  providerSubscriptionId: {
    type: String,
    default: null,
  },
  currentPeriodStart: {
    type: Date,
    default: null,
  },
  currentPeriodEnd: {
    type: Date,
    default: null,
  },
  trialEndsAt: {
    type: Date,
    default: null,
  },
  canceledAt: {
    type: Date,
    default: null,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

subscriptionSchema.index({ developer: 1, status: 1 });
subscriptionSchema.index({ provider: 1, providerSubscriptionId: 1 }, { sparse: true });
subscriptionSchema.index({ expiresAt: 1 }, { sparse: true });

subscriptionSchema.statics.getActiveForDeveloper = function (developerId) {
  return this.findOne({ developer: developerId, status: 'active' }).lean();
};

subscriptionSchema.statics.createFromPlan = async function (developerId, plan, provider = 'none') {
  const plans = {
    free: { dailyLimit: 100, maxKeys: 5, scopes: ['users:read', 'bot:read'], cacheTier: 'standard', webhook: false },
    pro: { dailyLimit: 10000, maxKeys: 25, scopes: ['users:read', 'bot:read', 'guilds:read', 'presence:read'], cacheTier: 'fast', webhook: false },
    enterprise: { dailyLimit: 100000, maxKeys: 100, scopes: ['*'], cacheTier: 'priority', webhook: true },
  };

  const cfg = plans[plan] || plans.free;
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  return this.create({
    developer: developerId,
    plan,
    status: 'active',
    dailyLimit: cfg.dailyLimit,
    maxKeys: cfg.maxKeys,
    scopes: cfg.scopes,
    cacheTier: cfg.cacheTier,
    webhookEnabled: cfg.webhook,
    provider,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    expiresAt: periodEnd,
  });
};

subscriptionSchema.methods.isExpired = function () {
  return this.expiresAt && new Date() > this.expiresAt;
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
