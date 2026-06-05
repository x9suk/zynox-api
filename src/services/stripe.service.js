const logger = require('../utils/logger');

let stripe = null;

function getStripe() {
  if (!stripe) {
    const Stripe = require('stripe');
    const config = require('../config/env');
    if (config.stripe?.secretKey) {
      stripe = new Stripe(config.stripe.secretKey);
    }
  }
  return stripe;
}

async function createCheckoutSession(developerId, priceId, successUrl, cancelUrl) {
  const s = getStripe();
  if (!s) throw new Error('Stripe not configured');
  const session = await s.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { developerId: developerId.toString() },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  return session;
}

async function handleWebhook(event) {
  logger.info({ type: event.type }, 'Stripe webhook received');
  const developerService = require('./developer.service');

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const developerId = session.metadata?.developerId;
      const plan = session.metadata?.plan || 'pro';
      if (developerId) {
        await developerService.updatePlan(developerId, plan);
        logger.info({ developerId, plan }, 'Plan upgraded via Stripe');
      }
      break;
    }
    case 'customer.subscription.deleted':
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const developerId = sub.metadata?.developerId;
      if (developerId && sub.status !== 'active' && sub.status !== 'trialing') {
        await developerService.updatePlan(developerId, 'free');
        logger.info({ developerId }, 'Plan downgraded to free via Stripe');
      }
      break;
    }
  }
}

async function createPortalSession(customerId, returnUrl) {
  const s = getStripe();
  if (!s) throw new Error('Stripe not configured');
  return s.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
}

module.exports = { createCheckoutSession, handleWebhook, createPortalSession };
