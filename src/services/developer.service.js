const { Developer, Subscription, ApiKey } = require('../models');
const logger = require('../utils/logger');

const developerService = {
  async createOrUpdateFromDiscord(discordUser) {
    const dev = await Developer.upsertFromDiscord(discordUser);

    const existingSub = await Subscription.getActiveForDeveloper(dev._id);
    if (!existingSub && dev.plan === 'free') {
      await Subscription.createFromPlan(dev._id, 'free');
    }

    logger.info({ discordId: dev.discordId, plan: dev.plan }, 'Developer upserted from Discord');
    return dev;
  },

  async getByDiscordId(discordId) {
    return Developer.findByDiscordId(discordId);
  },

  async getById(id) {
    return Developer.findById(id).lean();
  },

  async checkBanned(developer) {
    if (!developer) return { allowed: false, reason: 'Developer not found' };
    if (developer.isBanned) return { allowed: false, reason: 'Account is banned' };
    return { allowed: true };
  },

  async getPlanLimits(developer) {
    const sub = await Subscription.getActiveForDeveloper(developer._id);
    if (sub) {
      return {
        dailyLimit: sub.dailyLimit,
        maxKeys: sub.maxKeys,
        scopes: sub.scopes,
        cacheTier: sub.cacheTier,
        webhookEnabled: sub.webhookEnabled,
      };
    }
    const Dev = require('../models/Developer');
    const temp = new Dev(developer);
    return temp.getPlanLimits();
  },

  async checkDailyLimit(developer) {
    const today = new Date().toISOString().slice(0, 10);
    const limits = await this.getPlanLimits(developer);

    if (developer.dailyUsage && developer.dailyUsage.date === today && developer.dailyUsage.count >= limits.dailyLimit) {
      return {
        allowed: false,
        reason: 'Daily request limit reached',
        limit: limits.dailyLimit,
        used: developer.dailyUsage.count,
        resetsAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
      };
    }

    return { allowed: true, limit: limits.dailyLimit, used: developer.dailyUsage?.count || 0 };
  },

  async incrementDailyUsage(developerId) {
    const dev = await Developer.findById(developerId);
    if (!dev) return null;

    const today = new Date().toISOString().slice(0, 10);
    if (dev.dailyUsage.date !== today) {
      dev.dailyUsage = { count: 0, date: today };
    }
    dev.dailyUsage.count += 1;
    await dev.save();
    return dev.dailyUsage;
  },

  async listApiKeys(developerId) {
    return ApiKey.find({ developer: developerId })
      .select('-keyHash')
      .sort({ createdAt: -1 })
      .lean();
  },

  async getApiKey(developerId, keyId) {
    return ApiKey.findOne({ _id: keyId, developer: developerId })
      .select('-keyHash')
      .lean();
  },

  async createApiKey(developerId, name, options = {}) {
    const dev = await Developer.findById(developerId).lean();
    if (!dev) throw new Error('Developer not found');

    const limits = await this.getPlanLimits(dev);
    const keyCount = await ApiKey.countDocuments({ developer: developerId, isActive: true });
    if (keyCount >= (limits.maxKeys || dev.maxApiKeys || 5)) {
      throw new Error(`Maximum API key limit reached (${limits.maxKeys || dev.maxApiKeys})`);
    }

    const result = await ApiKey.generateKey(developerId, name, {
      plan: dev.plan,
      ...options,
    });

    await Developer.findByIdAndUpdate(developerId, { $inc: { apiKeyCount: 1 } });

    return result;
  },

  async revokeApiKey(developerId, keyId) {
    const key = await ApiKey.findOneAndUpdate(
      { _id: keyId, developer: developerId },
      { isActive: false },
      { new: true },
    );
    if (key) {
      await Developer.findByIdAndUpdate(developerId, { $inc: { apiKeyCount: -1 } });
    }
    return key;
  },

  async regenerateApiKey(developerId, keyId) {
    const key = await ApiKey.findOne({ _id: keyId, developer: developerId }).lean();
    if (!key) return null;

    await ApiKey.findByIdAndUpdate(keyId, { isActive: false });

    const result = await ApiKey.generateKey(developerId, key.name, {
      plan: key.plan,
      scopes: key.scopes,
      dailyLimit: key.dailyLimit,
      webhookUrl: key.webhookUrl,
      expiresAt: key.expiresAt,
    });

    return result;
  },

  async updatePlan(developerId, newPlan) {
    const dev = await Developer.findByIdAndUpdate(
      developerId,
      { plan: newPlan },
      { new: true },
    );
    if (!dev) return null;

    await Subscription.createFromPlan(developerId, newPlan);
    return dev;
  },

  async banDeveloper(developerId, reason = null) {
    await ApiKey.updateMany({ developer: developerId, isActive: true }, { isActive: false });
    return Developer.findByIdAndUpdate(
      developerId,
      { isBanned: true, banReason: reason },
      { new: true },
    );
  },

  async unbanDeveloper(developerId) {
    return Developer.findByIdAndUpdate(
      developerId,
      { isBanned: false, banReason: null },
      { new: true },
    );
  },
};

module.exports = developerService;
