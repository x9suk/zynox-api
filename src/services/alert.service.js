const logger = require('../utils/logger');

const alertedKeys = new Map();

async function checkAndAlert(keyId, developerId, usage, limit) {
  const threshold = Math.floor(limit * 0.8);
  if (usage < threshold) return;

  const lastAlert = alertedKeys.get(keyId);
  const now = Date.now();

  if (lastAlert && (now - lastAlert) < 3600000) return;

  alertedKeys.set(keyId, now);
  logger.warn({ keyId, developerId, usage, limit }, 'Rate limit threshold crossed — 80% usage');
}

module.exports = { checkAndAlert };
