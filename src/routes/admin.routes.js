const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { developerAuth } = require('../middleware/developerAuth');
const { adminAuth } = require('../middleware/adminAuth');
const adminController = require('../controllers/admin.controller');

const router = Router();

router.use(developerAuth, adminAuth);

router.get('/developers', asyncHandler(adminController.listDevelopers));
router.get('/developers/:id', asyncHandler(adminController.getDeveloper));
router.post('/developers/:id/ban', asyncHandler(adminController.banDeveloper));
router.post('/developers/:id/unban', asyncHandler(adminController.unbanDeveloper));
router.patch('/developers/:id/plan', asyncHandler(adminController.changePlan));
router.get('/stats', asyncHandler(adminController.getStats));

module.exports = router;
