const developerService = require('../services/developer.service');
const { ApiKey } = require('../models');
const { NotFoundError, ValidationError, ForbiddenError } = require('../utils/errors');

const VALID_SCOPES = ['users:read', 'presence:read', 'bot:read', 'guilds:read', '*'];

async function listKeys(req, res) {
  const keys = await developerService.listApiKeys(req.developer.id);

  const safeKeys = keys.map((k) => ({
    id: k._id,
    name: k.name,
    keyPrefix: k.keyPrefix,
    plan: k.plan,
    scopes: k.scopes,
    dailyLimit: k.dailyLimit,
    rateLimitPerMinute: k.rateLimitPerMinute,
    isActive: k.isActive,
    webhookUrl: k.webhookUrl,
    lastUsedAt: k.lastUsedAt,
    createdAt: k.createdAt,
    expiresAt: k.expiresAt,
  }));

  res.json({ success: true, keys: safeKeys });
}

async function createKey(req, res) {
  const { name, scopes, webhookUrl, expiresAt } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new ValidationError('Name is required');
  }
  if (name.length > 100) {
    throw new ValidationError('Name must be 100 characters or less');
  }

  if (scopes) {
    if (!Array.isArray(scopes)) {
      throw new ValidationError('Scopes must be an array');
    }
    const invalid = scopes.filter((s) => !VALID_SCOPES.includes(s));
    if (invalid.length > 0) {
      throw new ValidationError(`Invalid scopes: ${invalid.join(', ')}. Valid: ${VALID_SCOPES.join(', ')}`);
    }
  }

  if (webhookUrl) {
    try {
      new URL(webhookUrl);
    } catch {
      throw new ValidationError('Invalid webhook URL');
    }
  }

  try {
    const result = await developerService.createApiKey(req.developer.id, name.trim(), {
      scopes,
      webhookUrl: webhookUrl || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    res.status(201).json({
      success: true,
      message: 'API key created. Store this key securely — it will not be shown again.',
      key: result,
    });
  } catch (err) {
    if (err.message.includes('Maximum API key limit')) {
      throw new ForbiddenError(err.message);
    }
    throw err;
  }
}

async function getKey(req, res) {
  const key = await developerService.getApiKey(req.developer.id, req.params.id);
  if (!key) throw new NotFoundError('API key not found');

  res.json({
    success: true,
    key: {
      id: key._id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      plan: key.plan,
      scopes: key.scopes,
      dailyLimit: key.dailyLimit,
      rateLimitPerMinute: key.rateLimitPerMinute,
      isActive: key.isActive,
      webhookUrl: key.webhookUrl,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
    },
  });
}

async function updateKey(req, res) {
  const { name, scopes, webhookUrl, isActive } = req.body;

  const update = {};
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new ValidationError('Name must be a non-empty string');
    }
    update.name = name.trim();
  }
  if (scopes !== undefined) {
    if (!Array.isArray(scopes)) throw new ValidationError('Scopes must be an array');
    const invalid = scopes.filter((s) => !VALID_SCOPES.includes(s));
    if (invalid.length > 0) {
      throw new ValidationError(`Invalid scopes: ${invalid.join(', ')}`);
    }
    update.scopes = scopes;
  }
  if (webhookUrl !== undefined) {
    if (webhookUrl) {
      try { new URL(webhookUrl); } catch { throw new ValidationError('Invalid webhook URL'); }
    }
    update.webhookUrl = webhookUrl || null;
  }
  if (isActive !== undefined) {
    update.isActive = !!isActive;
  }
  if (req.body.expiresAt !== undefined) {
    update.expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
  }

  if (Object.keys(update).length === 0) {
    return res.json({ success: true, message: 'No changes provided' });
  }

  const key = await ApiKey.findOneAndUpdate(
    { _id: req.params.id, developer: req.developer.id },
    { $set: update },
    { new: true, runValidators: true },
  ).lean();

  if (!key) throw new NotFoundError('API key not found');

  res.json({ success: true, key });
}

async function deleteKey(req, res) {
  const key = await developerService.revokeApiKey(req.developer.id, req.params.id);
  if (!key) throw new NotFoundError('API key not found');

  res.json({ success: true, message: 'API key revoked' });
}

async function regenerateKey(req, res) {
  try {
    const result = await developerService.regenerateApiKey(req.developer.id, req.params.id);
    if (!result) throw new NotFoundError('API key not found');

    res.json({
      success: true,
      message: 'New API key generated. The old key has been revoked. Store this key securely — it will not be shown again.',
      key: result,
    });
  } catch (err) {
    if (err.message.includes('Maximum API key limit')) {
      throw new ForbiddenError(err.message);
    }
    throw err;
  }
}

async function rotateKey(req, res) {
  const key = await ApiKey.findOne({ _id: req.params.id, developer: req.developer.id });
  if (!key) throw new NotFoundError('API key not found');

  const days = parseInt(req.body.days, 10) || 30;
  key.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await key.save();

  res.json({ success: true, expiresAt: key.expiresAt });
}

async function testWebhook(req, res) {
  const webhookService = require('../services/webhook.service');
  const key = await ApiKey.findOne({ _id: req.params.id, developer: req.developer.id }).lean();
  if (!key) throw new NotFoundError('API key not found');
  if (!key.webhookUrl) throw new ValidationError('No webhook URL configured for this key');

  const result = await webhookService.deliver(key.webhookUrl, 'test', {
    message: 'This is a test webhook from Zynox API',
    keyId: key._id,
    keyName: key.name,
  }, key.webhookSecret || undefined);

  res.json({ success: result.success, status: result.status || null, message: result.success ? 'Webhook delivered' : 'Webhook delivery failed' });
}

module.exports = { listKeys, createKey, getKey, updateKey, deleteKey, regenerateKey, rotateKey, testWebhook };
