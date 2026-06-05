const mongoose = require('mongoose');
const crypto = require('crypto');
const { nanoid } = require('nanoid');

const apiKeySchema = new mongoose.Schema({
  developer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Developer',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  keyPrefix: {
    type: String,
    required: true,
    index: true,
  },
  keyHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  plan: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free',
  },
  scopes: {
    type: [String],
    default: ['users:read', 'bot:read'],
  },
  dailyLimit: {
    type: Number,
    default: 100,
  },
  dailyUsed: {
    type: Number,
    default: 0,
  },
  dailyDate: {
    type: String,
    default: null,
  },
  rateLimitPerMinute: {
    type: Number,
    default: 30,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  webhookUrl: {
    type: String,
    default: null,
  },
  webhookSecret: {
    type: String,
    default: null,
  },
  lastUsedAt: {
    type: Date,
    default: null,
  },
  lastIp: {
    type: String,
    default: null,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  abuseFlags: [{
    type: { type: String, enum: ['rate_abuse', 'scope_abuse', 'rotation', 'suspicious'] },
    reason: String,
    createdAt: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true,
});

apiKeySchema.index({ isActive: 1 });
apiKeySchema.index({ expiresAt: 1 }, { sparse: true });
apiKeySchema.index({ plan: 1 });

function generateKeyValue(prefix) {
  const suffix = nanoid(48);
  return `${prefix}_${suffix}`;
}

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

apiKeySchema.statics.generateKey = async function (developerId, name, options = {}) {
  const prefix = options.prefix || 'zynox';
  const rawKey = generateKeyValue(prefix);
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.substring(0, rawKey.indexOf('_') + 6);

  const plan = options.plan || 'free';
  const planDefaults = {
    free: { dailyLimit: 100, rateLimitPerMinute: 10, scopes: ['users:read', 'bot:read'] },
    pro: { dailyLimit: 10000, rateLimitPerMinute: 60, scopes: ['users:read', 'bot:read', 'guilds:read', 'presence:read'] },
    enterprise: { dailyLimit: 100000, rateLimitPerMinute: 300, scopes: ['*'] },
  };

  const defaults = planDefaults[plan] || planDefaults.free;

  const doc = await this.create({
    developer: developerId,
    name,
    keyPrefix,
    keyHash,
    plan,
    scopes: options.scopes || defaults.scopes,
    dailyLimit: options.dailyLimit || defaults.dailyLimit,
    rateLimitPerMinute: options.rateLimitPerMinute || defaults.rateLimitPerMinute,
    webhookUrl: options.webhookUrl || null,
    expiresAt: options.expiresAt || null,
  });

  return {
    key: rawKey,
    id: doc._id,
    name: doc.name,
    keyPrefix: doc.keyPrefix,
    plan: doc.plan,
    scopes: doc.scopes,
    dailyLimit: doc.dailyLimit,
    createdAt: doc.createdAt,
  };
};

apiKeySchema.statics.verifyKey = async function (rawKey) {
  const keyHash = hashKey(rawKey);
  const doc = await this.findOne({ keyHash, isActive: true }).populate('developer').lean();
  if (!doc) return null;
  if (doc.expiresAt && new Date(doc.expiresAt) < new Date()) return null;
  if (doc.developer && doc.developer.isBanned) return null;
  return doc;
};

apiKeySchema.statics.findByPrefix = function (prefix) {
  return this.findOne({ keyPrefix: prefix }).lean();
};

apiKeySchema.statics.revokeKey = function (id) {
  return this.findByIdAndUpdate(id, { isActive: false }, { new: true });
};

apiKeySchema.statics.regenerateKey = async function (id) {
  const doc = await this.findById(id).lean();
  if (!doc) return null;

  await this.findByIdAndUpdate(id, { isActive: false });

  return this.generateKey(doc.developer, doc.name, {
    plan: doc.plan,
    scopes: doc.scopes,
    dailyLimit: doc.dailyLimit,
    webhookUrl: doc.webhookUrl,
    expiresAt: doc.expiresAt,
  });
};

apiKeySchema.methods.toSafe = function () {
  return {
    id: this._id,
    name: this.name,
    keyPrefix: this.keyPrefix,
    plan: this.plan,
    scopes: this.scopes,
    dailyLimit: this.dailyLimit,
    rateLimitPerMinute: this.rateLimitPerMinute,
    isActive: this.isActive,
    webhookUrl: this.webhookUrl,
    lastUsedAt: this.lastUsedAt,
    createdAt: this.createdAt,
    expiresAt: this.expiresAt,
  };
};

module.exports = mongoose.model('ApiKey', apiKeySchema);
