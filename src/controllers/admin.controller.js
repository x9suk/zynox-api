const { Developer, ApiKey } = require('../models');
const developerService = require('../services/developer.service');
const { NotFoundError, ValidationError } = require('../utils/errors');

async function listDevelopers(req, res) {
  const { page = 1, limit = 20, plan, isBanned, search } = req.query;
  const query = {};
  if (plan) query.plan = plan;
  if (isBanned !== undefined) query.isBanned = isBanned === 'true';
  if (search) {
    query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { discordId: search },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await Developer.countDocuments(query);
  const developers = await Developer.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit, 10))
    .lean();

  res.json({
    success: true,
    developers: developers.map(d => ({
      id: d._id,
      discordId: d.discordId,
      username: d.username,
      avatar: d.avatar,
      email: d.email,
      role: d.role,
      plan: d.plan,
      isBanned: d.isBanned,
      banReason: d.banReason,
      apiKeyCount: d.apiKeyCount || 0,
      abuseScore: d.abuseScore || 0,
      lastLoginAt: d.lastLoginAt,
      createdAt: d.createdAt,
    })),
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

async function getDeveloper(req, res) {
  const dev = await Developer.findById(req.params.id).lean();
  if (!dev) throw new NotFoundError('Developer not found');
  const keys = await ApiKey.find({ developer: dev._id }).select('-keyHash').lean();

  res.json({
    success: true,
    developer: { ...dev, keys },
  });
}

async function banDeveloper(req, res) {
  const { reason } = req.body;
  const dev = await developerService.banDeveloper(req.params.id, reason || null);
  if (!dev) throw new NotFoundError('Developer not found');
  res.json({ success: true, message: 'Developer banned', developer: dev });
}

async function unbanDeveloper(req, res) {
  const dev = await developerService.unbanDeveloper(req.params.id);
  if (!dev) throw new NotFoundError('Developer not found');
  res.json({ success: true, message: 'Developer unbanned', developer: dev });
}

async function changePlan(req, res) {
  const { plan } = req.body;
  if (!['free', 'pro', 'enterprise'].includes(plan)) {
    throw new ValidationError('Invalid plan. Must be free, pro, or enterprise');
  }
  const dev = await developerService.updatePlan(req.params.id, plan);
  if (!dev) throw new NotFoundError('Developer not found');
  res.json({ success: true, message: `Plan changed to ${plan}`, developer: dev });
}

async function getStats(req, res) {
  const [totalDevelopers, activeKeys, bannedCount, planCounts] = await Promise.all([
    Developer.countDocuments(),
    ApiKey.countDocuments({ isActive: true }),
    Developer.countDocuments({ isBanned: true }),
    Developer.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } },
    ]),
  ]);

  const planBreakdown = { free: 0, pro: 0, enterprise: 0 };
  for (const p of planCounts) planBreakdown[p._id] = p.count;

  res.json({
    success: true,
    stats: {
      totalDevelopers,
      activeKeys,
      bannedCount,
      planBreakdown,
    },
  });
}

module.exports = { listDevelopers, getDeveloper, banDeveloper, unbanDeveloper, changePlan, getStats };
