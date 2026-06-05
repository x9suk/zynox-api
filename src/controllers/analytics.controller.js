const analyticsService = require('../services/analytics.service');

async function exportUsage(req, res) {
  const { format = 'json', period = '7d', keyId } = req.query;
  const result = await analyticsService.exportUsage(req.developer.id, { format, period, keyId: keyId || null });

  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.send(result.raw);
}

async function getAnalytics(req, res) {
  const data = await analyticsService.getDeveloperAnalytics(req.developer.id);
  if (!data) return res.status(404).json({ success: false, message: 'Developer not found' });
  res.json({ success: true, ...data });
}

module.exports = { exportUsage, getAnalytics };
