const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { apiKeyAuth, requireScope } = require('../middleware/apiKeyAuth');
const publicController = require('../controllers/public.controller');

const router = Router();

router.use(apiKeyAuth({ required: true }));

router.get('/users/:id', requireScope('users:read'), asyncHandler(publicController.getPublicUser));

router.get('/users/:id/presence', requireScope('presence:read'), asyncHandler(publicController.getUserPresence));

router.get('/bots/:id/stats', requireScope('bot:read'), asyncHandler(publicController.getBotStats));

router.get('/guilds/:id/stats', requireScope('guilds:read'), asyncHandler(publicController.getGuildStats));

router.get('/users/:id/timeline', requireScope('presence:read'), asyncHandler(publicController.getUserTimeline));

router.post('/users/batch', requireScope('users:read'), asyncHandler(publicController.getUsersBatch));
router.post('/bots/batch', requireScope('bot:read'), asyncHandler(publicController.getBotsBatch));
router.post('/guilds/batch', requireScope('guilds:read'), asyncHandler(publicController.getGuildsBatch));

module.exports = router;
