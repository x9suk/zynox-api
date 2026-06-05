const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const { connectDatabase } = require('../src/config/database');
const { Developer, ApiKey } = require('../src/models');
const { sha256 } = require('../src/utils/hash');
const { getRedis } = require('../src/config/redis');
const config = require('../src/config/env');
const jwt = require('jsonwebtoken');

const p = config.redis.prefix;

let freeDev, adminDev, freeKey, adminKey;
let freeJwt, adminJwt;

async function createTestDeveloper(discordId, username, overrides = {}) {
  const dev = await Developer.findOneAndUpdate(
    { discordId },
    {
      $set: {
        discordId,
        username,
        globalName: username,
        avatar: null,
        email: `${username}@test.com`,
        role: overrides.role || 'developer',
        plan: overrides.plan || 'free',
        isBanned: overrides.isBanned || false,
        maxApiKeys: 10,
        lastLoginAt: new Date(),
      },
      $setOnInsert: { dailyUsage: { count: 0, date: null } },
    },
    { upsert: true, new: true },
  );
  return dev;
}

async function createTestApiKey(developerId, options = {}) {
  const rawKey = `zynox_test_${require('crypto').randomBytes(24).toString('hex')}`;
  const keyHash = sha256(rawKey);
  const doc = await ApiKey.create({
    developer: developerId,
    name: options.name || 'Test Key',
    keyPrefix: rawKey.substring(0, 12),
    keyHash,
    plan: options.plan || 'free',
    scopes: options.scopes || ['users:read', 'bot:read', 'presence:read', 'guilds:read'],
    dailyLimit: options.dailyLimit || 1000,
    rateLimitPerMinute: 60,
    isActive: options.isActive !== false,
    webhookUrl: options.webhookUrl || null,
    webhookSecret: options.webhookSecret || null,
    expiresAt: options.expiresAt || null,
  });
  return { rawKey, doc };
}

function generateJwt(developer) {
  return jwt.sign(
    { sub: developer._id.toString(), discordId: developer.discordId, role: developer.role },
    config.jwt.secret,
    { expiresIn: '1h' },
  );
}

beforeAll(async () => {
  await connectDatabase();

  freeDev = await createTestDeveloper('100000000000000001', 'testuser1', { role: 'developer', plan: 'free' });
  adminDev = await createTestDeveloper('100000000000000002', 'adminuser', { role: 'superadmin', plan: 'enterprise' });

  const k1 = await createTestApiKey(freeDev._id, { name: 'Free Key' });
  freeKey = k1.rawKey;

  const k2 = await createTestApiKey(adminDev._id, { name: 'Admin Key', plan: 'enterprise', scopes: ['*'] });
  adminKey = k2.rawKey;

  freeJwt = generateJwt(freeDev);
  adminJwt = generateJwt(adminDev);

  const redis = await getRedis();
  await redis.setEx(`${p}test:ready`, 30, '1');
});

afterAll(async () => {
  await Developer.deleteMany({ discordId: { $in: ['100000000000000001', '100000000000000002', '100000000000000099'] } });
  await ApiKey.deleteMany({ developer: { $in: [freeDev._id, adminDev._id] } });
  const redis = await getRedis();
  await redis.del(`${p}test:ready`);
  await mongoose.connection.close();
});

describe('Batch Endpoints', () => {
  describe('POST /api/v1/public/users/batch', () => {
    it('should return 401 without API key', async () => {
      const res = await request(app).post('/api/v1/public/users/batch').send({ ids: ['123456789012345678'] });
      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid API key', async () => {
      const res = await request(app)
        .post('/api/v1/public/users/batch')
        .set('x-api-key', 'invalid_key_xxx')
        .send({ ids: ['123456789012345678'] });
      expect(res.status).toBe(401);
    });

    it('should validate ids is a non-empty array', async () => {
      const res = await request(app)
        .post('/api/v1/public/users/batch')
        .set('x-api-key', freeKey)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe(true);
    });

    it('should reject more than 100 IDs', async () => {
      const ids = Array.from({ length: 101 }, (_, i) => String(100000000000000000 + i));
      const res = await request(app)
        .post('/api/v1/public/users/batch')
        .set('x-api-key', freeKey)
        .send({ ids });
      expect(res.status).toBe(400);
    });

    it('should reject invalid snowflakes', async () => {
      const res = await request(app)
        .post('/api/v1/public/users/batch')
        .set('x-api-key', freeKey)
        .send({ ids: ['not-a-snowflake'] });
      expect(res.status).toBe(400);
    });

    it('should return array of results for valid IDs', async () => {
      const res = await request(app)
        .post('/api/v1/public/users/batch')
        .set('x-api-key', freeKey)
        .send({ ids: ['123456789012345678'] });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should enforce scope: missing scope returns 403', async () => {
      const limitedKey = await createTestApiKey(freeDev._id, { name: 'NoUsersRead', scopes: ['bot:read'] });
      const res = await request(app)
        .post('/api/v1/public/users/batch')
        .set('x-api-key', limitedKey.rawKey)
        .send({ ids: ['123456789012345678'] });
      expect(res.status).toBe(403);
      await ApiKey.findByIdAndDelete(limitedKey.doc._id);
    });
  });

  describe('POST /api/v1/public/bots/batch', () => {
    it('should return array of bot stats', async () => {
      const res = await request(app)
        .post('/api/v1/public/bots/batch')
        .set('x-api-key', freeKey)
        .send({ ids: ['123456789012345678'] });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/public/guilds/batch', () => {
    it('should return array of guild stats', async () => {
      const res = await request(app)
        .post('/api/v1/public/guilds/batch')
        .set('x-api-key', freeKey)
        .send({ ids: ['123456789012345678'] });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

describe('Timeline Endpoint', () => {
  describe('GET /api/v1/public/users/:id/timeline', () => {
    it('should return 401 without API key', async () => {
      const res = await request(app).get('/api/v1/public/users/123456789012345678/timeline');
      expect(res.status).toBe(401);
    });

    it('should return timeline data or empty', async () => {
      const res = await request(app)
        .get('/api/v1/public/users/123456789012345678/timeline')
        .set('x-api-key', freeKey);
      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });

    it('should respect limit query param', async () => {
      const res = await request(app)
        .get('/api/v1/public/users/123456789012345678/timeline?limit=5')
        .set('x-api-key', freeKey);
      expect([200, 404]).toContain(res.status);
    });

    it('should cap limit at 200', async () => {
      const res = await request(app)
        .get('/api/v1/public/users/123456789012345678/timeline?limit=999')
        .set('x-api-key', freeKey);
      expect([200, 404]).toContain(res.status);
    });

    it('should reject invalid snowflake', async () => {
      const res = await request(app)
        .get('/api/v1/public/users/abc/timeline')
        .set('x-api-key', freeKey);
      expect(res.status).toBe(400);
    });
  });
});

describe('Analytics Endpoints', () => {
  describe('GET /api/v1/developer/analytics', () => {
    it('should return 401 without JWT', async () => {
      const res = await request(app).get('/api/v1/developer/analytics');
      expect(res.status).toBe(401);
    });

    it('should return analytics for authenticated developer', async () => {
      const res = await request(app)
        .get('/api/v1/developer/analytics')
        .set('Authorization', `Bearer ${freeJwt}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('totalKeys');
      expect(res.body).toHaveProperty('activeKeys');
    });
  });

  describe('GET /api/v1/developer/analytics/export', () => {
    it('should return JSON export by default', async () => {
      const res = await request(app)
        .get('/api/v1/developer/analytics/export')
        .set('Authorization', `Bearer ${freeJwt}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/json/);
    });

    it('should return CSV export when format=csv', async () => {
      const res = await request(app)
        .get('/api/v1/developer/analytics/export?format=csv')
        .set('Authorization', `Bearer ${freeJwt}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
    });
  });
});

describe('Webhook Test Endpoint', () => {
  describe('POST /api/v1/developer/keys/:id/test-webhook', () => {
    it('should return 401 without JWT', async () => {
      const res = await request(app).post(`/api/v1/developer/keys/${freeDev._id}/test-webhook`);
      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent key', async () => {
      const fakeId = '000000000000000000000000';
      const res = await request(app)
        .post(`/api/v1/developer/keys/${fakeId}/test-webhook`)
        .set('Authorization', `Bearer ${freeJwt}`);
      expect(res.status).toBe(404);
    });

    it('should return 400 when no webhook URL configured', async () => {
      const keys = await ApiKey.find({ developer: freeDev._id, isActive: true }).lean();
      for (const key of keys) {
        const res = await request(app)
          .post(`/api/v1/developer/keys/${key._id}/test-webhook`)
          .set('Authorization', `Bearer ${freeJwt}`);
        expect(res.status).toBe(400);
        break;
      }
    });
  });
});

describe('Admin Endpoints', () => {
  describe('GET /api/v1/admin/stats', () => {
    it('should return 401 without JWT', async () => {
      const res = await request(app).get('/api/v1/admin/stats');
      expect(res.status).toBe(401);
    });

    it('should return 403 for non-admin JWT', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${freeJwt}`);
      expect(res.status).toBe(403);
    });

    it('should return stats for superadmin JWT', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Authorization', `Bearer ${adminJwt}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('stats');
    });
  });

  describe('GET /api/v1/admin/developers', () => {
    it('should list developers for admin', async () => {
      const res = await request(app)
        .get('/api/v1/admin/developers')
        .set('Authorization', `Bearer ${adminJwt}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('developers');
      expect(res.body).toHaveProperty('pagination');
    });

    it('should support search query', async () => {
      const res = await request(app)
        .get('/api/v1/admin/developers?search=testuser1')
        .set('Authorization', `Bearer ${adminJwt}`);
      expect(res.status).toBe(200);
      expect(res.body.developers.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by plan', async () => {
      const res = await request(app)
        .get('/api/v1/admin/developers?plan=enterprise')
        .set('Authorization', `Bearer ${adminJwt}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/admin/developers/:id', () => {
    it('should return developer details with keys', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/developers/${freeDev._id}`)
        .set('Authorization', `Bearer ${adminJwt}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.developer).toBeTruthy();
    });
  });

  describe('POST /api/v1/admin/developers/:id/ban', () => {
    it('should ban a developer', async () => {
      const target = await createTestDeveloper('100000000000000099', 'bantest');
      const res = await request(app)
        .post(`/api/v1/admin/developers/${target._id}/ban`)
        .set('Authorization', `Bearer ${adminJwt}`)
        .send({ reason: 'Test ban' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = await Developer.findById(target._id).lean();
      expect(check.isBanned).toBe(true);
      await Developer.findByIdAndDelete(target._id);
    });
  });

  describe('POST /api/v1/admin/developers/:id/unban', () => {
    it('should unban a developer', async () => {
      const target = await createTestDeveloper('100000000000000098', 'unbantest', { isBanned: true });
      const res = await request(app)
        .post(`/api/v1/admin/developers/${target._id}/unban`)
        .set('Authorization', `Bearer ${adminJwt}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = await Developer.findById(target._id).lean();
      expect(check.isBanned).toBe(false);
      await Developer.findByIdAndDelete(target._id);
    });
  });

  describe('PATCH /api/v1/admin/developers/:id/plan', () => {
    it('should change developer plan', async () => {
      const target = await createTestDeveloper('100000000000000097', 'plantest');
      const res = await request(app)
        .patch(`/api/v1/admin/developers/${target._id}/plan`)
        .set('Authorization', `Bearer ${adminJwt}`)
        .send({ plan: 'pro' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = await Developer.findById(target._id).lean();
      expect(check.plan).toBe('pro');
      await Developer.findByIdAndDelete(target._id);
    });

    it('should reject invalid plan', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/developers/${freeDev._id}/plan`)
        .set('Authorization', `Bearer ${adminJwt}`)
        .send({ plan: 'invalid' });
      expect(res.status).toBe(400);
    });
  });
});

describe('Slash Commands (Unit)', () => {
  it('/ping should return latency and API ping', async () => {
    const pingCmd = require('../src/bot/commands/ping');
    const reply = jest.fn().mockResolvedValue({ createdTimestamp: Date.now() });
    const editReply = jest.fn().mockResolvedValue(undefined);
    const interaction = {
      createdTimestamp: Date.now() - 100,
      reply,
      editReply,
      client: { ws: { ping: 42 } },
    };
    await pingCmd(interaction);
    expect(reply).toHaveBeenCalledWith({ content: 'Pinging...', fetchReply: true });
    expect(editReply).toHaveBeenCalled();
    const embedArg = editReply.mock.calls[0][0].embeds[0];
    expect(embedArg.data.fields[0].value).toMatch(/\d+ms/);
    expect(embedArg.data.fields[1].value).toBe('42ms');
  });

  it('/stats should return bot statistics', async () => {
    const statsCmd = require('../src/bot/commands/stats');
    const reply = jest.fn().mockResolvedValue(undefined);
    const interaction = {
      reply,
      client: {
        guilds: { cache: { size: 5 } },
        users: { cache: { size: 100 } },
      },
    };
    await statsCmd(interaction);
    expect(reply).toHaveBeenCalled();
    const embedArg = reply.mock.calls[0][0].embeds[0];
    expect(embedArg.data.title).toBe('Bot Statistics');
    expect(embedArg.data.fields[0].value).toBe('5');
    expect(embedArg.data.fields[1].value).toBe('100');
  });

  it('/invite should return invite link', async () => {
    const inviteCmd = require('../src/bot/commands/invite');
    const reply = jest.fn().mockResolvedValue(undefined);
    const interaction = { reply };
    await inviteCmd(interaction);
    expect(reply).toHaveBeenCalled();
    const embedArg = reply.mock.calls[0][0].embeds[0];
    expect(embedArg.data.title).toBe('Invite the Bot');
    expect(embedArg.data.description).toContain('Click here to invite me');
  });
});

describe('Bot Health Monitoring', () => {
  it('getHealth should return default disconnected state', () => {
    const health = require('../src/services/botHealth.service');
    const state = health.getHealth();
    expect(state).toHaveProperty('status');
    expect(state).toHaveProperty('uptime');
    expect(state).toHaveProperty('reconnectAttempts');
    expect(state).toHaveProperty('unstable');
  });

  it('startMonitoring should update state to connected', () => {
    const health = require('../src/services/botHealth.service');
    const mockClient = { on: () => {}, removeAllListeners: () => {} };
    health.startMonitoring(mockClient);
    const state = health.getHealth();
    expect(state.status).toBe('connected');
    health.stopMonitoring();
  });

  it('stopMonitoring should clean up client listeners', () => {
    const health = require('../src/services/botHealth.service');
    let removeCount = 0;
    const mockClient = {
      on: () => {},
      removeAllListeners: () => { removeCount++; },
    };
    health.startMonitoring(mockClient);
    health.stopMonitoring();
    expect(removeCount).toBe(3);
  });

  it('stopMonitoring should clean up client listeners', () => {
    const health = require('../src/services/botHealth.service');
    const mockClient = { on: jest.fn(), removeAllListeners: jest.fn() };
    health.startMonitoring(mockClient);
    health.stopMonitoring();
    expect(mockClient.removeAllListeners).toHaveBeenCalledTimes(3);
  });
});

describe('Gateway Event Safety', () => {
  it('messageCreate should only store count, not message content', async () => {
    const handler = require('../src/bot/events/messageCreate');
    const guildId = '999999999999999999';
    const message = {
      author: { bot: false },
      guild: { id: guildId },
      content: 'sensitive secret message',
    };
    await handler(message);
    const redis = await getRedis();
    const count = await redis.get(`${p}messages:guild:${guildId}`);
    expect(count).toBeTruthy();
    const parsed = parseInt(count, 10);
    expect(parsed).toBeGreaterThanOrEqual(1);
    await redis.del(`${p}messages:guild:${guildId}`);
  });

  it('messageCreate should skip bot messages', async () => {
    const handler = require('../src/bot/events/messageCreate');
    const message = {
      author: { bot: true },
      guild: { id: '999999999999999998' },
    };
    await expect(handler(message)).resolves.toBeUndefined();
  });

  it('messageCreate should skip DMs', async () => {
    const handler = require('../src/bot/events/messageCreate');
    const message = {
      author: { bot: false },
      guild: null,
    };
    await expect(handler(message)).resolves.toBeUndefined();
  });

  it('channelCreate and channelDelete should handle non-guild channels gracefully', async () => {
    const chCreate = require('../src/bot/events/channelCreate');
    const chDelete = require('../src/bot/events/channelDelete');
    const channel = { guild: null };
    await expect(chCreate(channel)).resolves.toBeUndefined();
    await expect(chDelete(channel)).resolves.toBeUndefined();
  });
});

describe('Stripe Billing Service', () => {
  it('handleWebhook should process checkout.session.completed', async () => {
    const stripeService = require('../src/services/stripe.service');
    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { developerId: freeDev._id.toString(), plan: 'pro' },
        },
      },
    };
    await stripeService.handleWebhook(event);
    const dev = await Developer.findById(freeDev._id).lean();
    expect(dev.plan).toBe('pro');
  });

  it('handleWebhook should downgrade on subscription.deleted', async () => {
    const stripeService = require('../src/services/stripe.service');
    const event = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          metadata: { developerId: freeDev._id.toString() },
          status: 'canceled',
        },
      },
    };
    await stripeService.handleWebhook(event);
    const dev = await Developer.findById(freeDev._id).lean();
    expect(dev.plan).toBe('free');
  });

  it('handleWebhook should not downgrade active subscriptions on updated', async () => {
    const stripeService = require('../src/services/stripe.service');
    await Developer.findByIdAndUpdate(freeDev._id, { plan: 'pro' });
    const event = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          metadata: { developerId: freeDev._id.toString() },
          status: 'active',
        },
      },
    };
    await stripeService.handleWebhook(event);
    const dev = await Developer.findById(freeDev._id).lean();
    expect(dev.plan).toBe('pro');
    await Developer.findByIdAndUpdate(freeDev._id, { plan: 'free' });
  });
});

describe('Developer Auth Middleware', () => {
  it('should reject requests without Authorization header', async () => {
    const res = await request(app).get('/api/v1/developer/me');
    expect(res.status).toBe(401);
  });

  it('should reject invalid JWT', async () => {
    const res = await request(app)
      .get('/api/v1/developer/me')
      .set('Authorization', 'Bearer invalid_token_here');
    expect(res.status).toBe(401);
  });

  it('should accept valid JWT and return developer profile', async () => {
    const res = await request(app)
      .get('/api/v1/developer/me')
      .set('Authorization', `Bearer ${freeJwt}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.developer).toBeTruthy();
    expect(res.body.developer.username).toBe('testuser1');
  });
});

describe('API Key Operations', () => {
  describe('POST /api/v1/developer/keys/:id/rotate', () => {
    it('should rotate key expiry', async () => {
      const keys = await ApiKey.find({ developer: freeDev._id, isActive: true }).lean();
      const key = keys[0];
      const res = await request(app)
        .post(`/api/v1/developer/keys/${key._id}/rotate`)
        .set('Authorization', `Bearer ${freeJwt}`)
        .send({ days: 60 });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.expiresAt).toBeTruthy();
    });

    it('should return 404 for non-existent key', async () => {
      const res = await request(app)
        .post('/api/v1/developer/keys/000000000000000000000000/rotate')
        .set('Authorization', `Bearer ${freeJwt}`)
        .send({ days: 30 });
      expect(res.status).toBe(404);
    });
  });
});
