const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
}));

router.get('/ready', asyncHandler(async (req, res) => {
  const mongoose = require('mongoose');
  const { getRedis } = require('../config/redis');

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      server: true,
      database: mongoose.connection.readyState === 1,
    },
  };

  try {
    const redis = await getRedis();
    await redis.ping();
    health.checks.redis = true;
  } catch {
    health.checks.redis = false;
  }

  const allOk = Object.values(health.checks).every(Boolean);
  if (!allOk) {
    health.status = 'degraded';
  }

  const statusCode = allOk ? 200 : 503;
  res.status(statusCode).json(health);
}));

module.exports = router;
