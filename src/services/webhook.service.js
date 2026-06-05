const crypto = require('crypto');
const { ApiKey } = require('../models');
const logger = require('../utils/logger');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const TIMEOUT_MS = 10000;

function signPayload(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(typeof payload === 'string' ? payload : JSON.stringify(payload));
  return hmac.digest('hex');
}

async function deliver(webhookUrl, event, payload, secret = null) {
  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Zynox-Webhook/1.0',
    'X-Zynox-Event': event,
    'X-Zynox-Timestamp': new Date().toISOString(),
  };

  if (secret) {
    headers['X-Zynox-Signature'] = signPayload(body, secret);
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        logger.info({ event, webhookUrl, status: response.status, attempt }, 'Webhook delivered');
        return { success: true, status: response.status };
      }

      logger.warn({ event, webhookUrl, status: response.status, attempt }, 'Webhook returned non-2xx');
    } catch (err) {
      clearTimeout(timeout);
      logger.warn({ event, webhookUrl, attempt, err: err.message }, 'Webhook delivery failed');
    }

    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
    }
  }

  logger.error({ event, webhookUrl }, 'Webhook delivery failed after all retries');
  return { success: false, error: 'All retries exhausted' };
}

async function deliverToKey(keyId, event, payload) {
  try {
    const key = await ApiKey.findById(keyId).lean();
    if (!key || !key.webhookUrl || !key.isActive) return;

    await deliver(key.webhookUrl, event, payload, key.webhookSecret || undefined);
  } catch (err) {
    logger.error({ keyId, event, err: err.message }, 'Failed to deliver webhook for key');
  }
}

async function deliverToAllKeys(event, payload, filter = {}) {
  const query = { isActive: true, webhookUrl: { $ne: null }, ...filter };
  const keys = await ApiKey.find(query).select('_id webhookUrl webhookSecret').lean();

  const results = await Promise.allSettled(
    keys.map(k => deliver(k.webhookUrl, event, payload, k.webhookSecret || undefined)),
  );

  const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.filter(r => r.status === 'fulfilled' && !r.value.success).length;
  const errored = results.filter(r => r.status === 'rejected').length;

  logger.info({ total: keys.length, succeeded, failed, errored, event }, 'Batch webhook delivery completed');
}

module.exports = { deliver, deliverToKey, deliverToAllKeys };
