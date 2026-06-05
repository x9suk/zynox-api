const { Router } = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const developerRoutes = require('./developer.routes');
const apiKeyRoutes = require('./apiKey.routes');
const publicRoutes = require('./public.routes');
const docsRoutes = require('./docs.routes');
const analyticsRoutes = require('./analytics.routes');
const adminRoutes = require('./admin.routes');
const stripeRoutes = require('./stripe.routes');

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/developer', developerRoutes);
router.use('/developer/keys', apiKeyRoutes);
router.use('/public', publicRoutes);
router.use('/docs', docsRoutes);
router.use('/developer/analytics', analyticsRoutes);
router.use('/admin', adminRoutes);
router.use('/stripe', stripeRoutes);

module.exports = router;
