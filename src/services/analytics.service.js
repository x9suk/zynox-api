const { ApiKey, Developer } = require('../models');
const rateLimitService = require('./rateLimit.service');
const logger = require('../utils/logger');

async function exportUsage(developerId, { format = 'json', period = '7d', keyId = null }) {
  const query = { developer: developerId, isActive: true };
  if (keyId) query._id = keyId;
  const keys = await ApiKey.find(query).select('-keyHash').lean();

  const days = period === '30d' ? 30 : period === 'today' ? 1 : 7;
  const data = [];

  for (const key of keys) {
    let dailyUsage = null;
    try {
      dailyUsage = await rateLimitService.getDailyUsage(key._id.toString());
    } catch (err) {
      logger.warn({ keyId: key._id, err }, 'Failed to get daily usage for key');
    }

    data.push({
      keyId: key._id,
      keyName: key.name,
      keyPrefix: key.keyPrefix,
      plan: key.plan,
      dailyLimit: key.dailyLimit,
      currentDailyUsed: dailyUsage?.used || 0,
      currentDailyDate: dailyUsage?.date || null,
      status: key.isActive ? 'active' : 'inactive',
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
    });
  }

  if (format === 'csv') {
    const headers = ['keyId,keyName,keyPrefix,plan,dailyLimit,currentDailyUsed,currentDailyDate,status,createdAt,expiresAt'];
    const rows = data.map(r =>
      `"${r.keyId}","${r.keyName}","${r.keyPrefix}","${r.plan}",${r.dailyLimit},${r.currentDailyUsed},"${r.currentDailyDate}","${r.status}","${r.createdAt || ''}","${r.expiresAt || ''}"`,
    );
    return { raw: [...headers, ...rows].join('\n'), contentType: 'text/csv', filename: `usage-export-${period}.csv` };
  }

  return { raw: data, contentType: 'application/json', filename: `usage-export-${period}.json` };
}

async function getDeveloperAnalytics(developerId) {
  const dev = await Developer.findById(developerId).lean();
  if (!dev) return null;

  const keys = await ApiKey.find({ developer: developerId }).select('-keyHash').lean();
  const totalKeys = keys.length;
  const activeKeys = keys.filter(k => k.isActive).length;

  let totalDailyUsed = 0;
  let totalDailyLimit = 0;
  for (const key of keys) {
    if (key.isActive) {
      try {
        const usage = await rateLimitService.getDailyUsage(key._id.toString());
        totalDailyUsed += usage.used;
      } catch { }
      totalDailyLimit += key.dailyLimit || 100;
    }
  }

  return {
    totalKeys,
    activeKeys,
    totalDailyUsed,
    totalDailyLimit,
    overallUsagePercent: totalDailyLimit > 0 ? Math.round((totalDailyUsed / totalDailyLimit) * 100) : 0,
    keys: keys.map(k => ({
      id: k._id,
      name: k.name,
      prefix: k.keyPrefix,
      plan: k.plan,
      isActive: k.isActive,
      expiresAt: k.expiresAt,
    })),
  };
}

module.exports = { exportUsage, getDeveloperAnalytics };
