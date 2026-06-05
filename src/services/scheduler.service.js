const { ApiKey } = require('../models');
const logger = require('../utils/logger');

const INTERVAL_MS = 15 * 60 * 1000;

let intervalHandle = null;

async function revokeExpiredKeys() {
  try {
    const result = await ApiKey.updateMany(
      { expiresAt: { $ne: null, $lte: new Date() }, isActive: true },
      { $set: { isActive: false } },
    );
    if (result.modifiedCount > 0) {
      logger.info({ modifiedCount: result.modifiedCount }, 'Revoked expired API keys');
    }
  } catch (err) {
    logger.error({ err }, 'Failed to revoke expired keys');
  }
}

function start() {
  revokeExpiredKeys();
  intervalHandle = setInterval(revokeExpiredKeys, INTERVAL_MS);
  logger.info({ intervalMs: INTERVAL_MS }, 'Key expiry scheduler started');
}

function stop() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

module.exports = { start, stop };
