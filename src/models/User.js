const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
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
  banner: {
    type: String,
    default: null,
  },
  bannerColor: {
    type: String,
    default: null,
  },
  accentColor: {
    type: Number,
    default: null,
  },
  discriminator: {
    type: String,
    default: null,
  },
  bot: {
    type: Boolean,
    default: false,
  },
  system: {
    type: Boolean,
    default: false,
  },
  locale: {
    type: String,
    default: null,
  },
  verified: {
    type: Boolean,
    default: null,
  },
  email: {
    type: String,
    default: null,
  },
  flags: {
    type: Number,
    default: 0,
  },
  premiumType: {
    type: Number,
    default: null,
  },
  publicFlags: {
    type: Number,
    default: 0,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  firstSeen: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

userSchema.index({ username: 1 });
userSchema.index({ lastSeen: -1 });
userSchema.index({ createdAt: -1 });

userSchema.statics.upsertDiscordUser = async function (data) {
  const discordId = data.id;
  const update = {
    discordId,
    username: data.username,
    globalName: data.global_name || null,
    avatar: data.avatar || null,
    banner: data.banner || null,
    bannerColor: data.banner_color || null,
    accentColor: data.accent_color || null,
    discriminator: data.discriminator || null,
    bot: data.bot || false,
    system: data.system || false,
    locale: data.locale || null,
    verified: data.verified ?? null,
    email: data.email || null,
    flags: data.flags || 0,
    premiumType: data.premium_type ?? null,
    publicFlags: data.public_flags || 0,
    lastSeen: new Date(),
  };

  return this.findOneAndUpdate(
    { discordId },
    { $set: update, $setOnInsert: { firstSeen: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

userSchema.statics.findByDiscordId = function (discordId) {
  return this.findOne({ discordId }).lean();
};

userSchema.methods.toSafeProfile = function () {
  return {
    id: this.discordId,
    username: this.username,
    globalName: this.globalName,
    avatar: this.avatar,
    banner: this.banner,
    bannerColor: this.bannerColor,
    accentColor: this.accentColor,
    bot: this.bot,
    createdAt: this.createdAt,
    lastSeen: this.lastSeen,
  };
};

module.exports = mongoose.model('User', userSchema);
