const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authController = require('../controllers/auth.controller');
const { developerAuth } = require('../middleware/developerAuth');

const router = Router();

router.get('/discord/login', asyncHandler(authController.login));
router.get('/discord/callback', asyncHandler(authController.callback));
router.post('/refresh', developerAuth, asyncHandler(authController.refreshToken));
router.post('/logout', developerAuth, asyncHandler(authController.logout));

module.exports = router;
