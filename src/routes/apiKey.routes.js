const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { developerAuth } = require('../middleware/developerAuth');
const apiKeyController = require('../controllers/apiKey.controller');

const router = Router();

router.use(developerAuth);

router.get('/', asyncHandler(apiKeyController.listKeys));
router.post('/', asyncHandler(apiKeyController.createKey));
router.get('/:id', asyncHandler(apiKeyController.getKey));
router.patch('/:id', asyncHandler(apiKeyController.updateKey));
router.delete('/:id', asyncHandler(apiKeyController.deleteKey));
router.post('/:id/regenerate', asyncHandler(apiKeyController.regenerateKey));
router.post('/:id/rotate', asyncHandler(apiKeyController.rotateKey));
router.post('/:id/test-webhook', asyncHandler(apiKeyController.testWebhook));

module.exports = router;
