const developerService = require('../services/developer.service');
const { Developer } = require('../models');
const { NotFoundError } = require('../utils/errors');

async function getMe(req, res) {
  const dev = await Developer.findById(req.developer.id).lean();
  if (!dev) throw new NotFoundError('Developer not found');

  const limits = await developerService.getPlanLimits(dev);

  const keys = await developerService.listApiKeys(req.developer.id);

  res.json({
    success: true,
    developer: {
      id: dev._id,
      discordId: dev.discordId,
      username: dev.username,
      globalName: dev.globalName,
      avatar: dev.avatar,
      email: dev.email,
      role: dev.role,
      plan: dev.plan,
      isBanned: dev.isBanned,
      lastLoginAt: dev.lastLoginAt,
      createdAt: dev.createdAt,
      apiKeyCount: keys.length,
      limits,
    },
  });
}

async function getUsage(req, res) {
  const dev = await Developer.findById(req.developer.id).lean();
  if (!dev) throw new NotFoundError('Developer not found');

  const limits = await developerService.getPlanLimits(dev);
  const today = new Date().toISOString().slice(0, 10);
  const used = dev.dailyUsage?.date === today ? dev.dailyUsage.count : 0;

  res.json({
    success: true,
    usage: {
      plan: dev.plan,
      dailyLimit: limits.dailyLimit,
      dailyUsed: used,
      dailyRemaining: Math.max(0, limits.dailyLimit - used),
      date: today,
      resetsAt: new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString(),
    },
  });
}

async function updateProfile(req, res) {
  const { globalName, email } = req.body;

  const update = {};
  if (globalName !== undefined) update.globalName = globalName;
  if (email !== undefined) update.email = email;

  if (Object.keys(update).length === 0) {
    return res.json({ success: true, message: 'No changes provided' });
  }

  const dev = await Developer.findByIdAndUpdate(req.developer.id, { $set: update }, { new: true }).lean();
  if (!dev) throw new NotFoundError('Developer not found');

  res.json({ success: true, developer: dev });
}

module.exports = { getMe, getUsage, updateProfile };
