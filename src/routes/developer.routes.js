const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { developerAuth } = require('../middleware/developerAuth');
const developerController = require('../controllers/developer.controller');

const router = Router();

router.use(developerAuth);

router.get('/me', asyncHandler(developerController.getMe));
router.get('/usage', asyncHandler(developerController.getUsage));
router.patch('/me', asyncHandler(developerController.updateProfile));

module.exports = router;
