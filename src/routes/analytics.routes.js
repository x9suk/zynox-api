const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { developerAuth } = require('../middleware/developerAuth');
const analyticsController = require('../controllers/analytics.controller');

const router = Router();

router.use(developerAuth);

router.get('/', asyncHandler(analyticsController.getAnalytics));
router.get('/export', asyncHandler(analyticsController.exportUsage));

module.exports = router;
