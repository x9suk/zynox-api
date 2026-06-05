const express = require('express');
const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { developerAuth } = require('../middleware/developerAuth');
const stripeService = require('../services/stripe.service');

const router = Router();

router.post('/webhook', express.raw({ type: 'application/json' }), asyncHandler(async (req, res) => {
  const config = require('../config/env');
  const sig = req.headers['stripe-signature'];
  const Stripe = require('stripe');
  const stripe = new Stripe(config.stripe.secretKey);
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, config.stripe.webhookSecret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }
  await stripeService.handleWebhook(event);
  res.json({ received: true });
}));

router.post('/create-checkout', developerAuth, asyncHandler(async (req, res) => {
  const { priceId, successUrl, cancelUrl } = req.body;
  if (!priceId || !successUrl || !cancelUrl) {
    return res.status(400).json({ error: 'Missing required fields: priceId, successUrl, cancelUrl' });
  }
  const session = await stripeService.createCheckoutSession(req.developer.id, priceId, successUrl, cancelUrl);
  res.json({ url: session.url, sessionId: session.id });
}));

module.exports = router;
