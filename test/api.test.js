const request = require('supertest');
const app = require('../src/app');

describe('Health Endpoints', () => {
  it('GET /api/v1/health should return 200', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET /api/v1/health/ready should return 200 or 503', async () => {
    const res = await request(app).get('/api/v1/health/ready');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('checks');
  });
});

describe('404 Handling', () => {
  it('GET /api/v1/nonexistent should return 404', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe(true);
  });
});

describe('Public API Auth', () => {
  it('GET /api/v1/public/users/123456789012345678 without key should return 401', async () => {
    const res = await request(app).get('/api/v1/public/users/123456789012345678');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe(true);
  });

  it('GET /api/v1/public/users/123456789012345678 with invalid key should return 401', async () => {
    const res = await request(app)
      .get('/api/v1/public/users/123456789012345678')
      .set('x-api-key', 'invalid_key_xxx');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe(true);
  });
});

describe('CORS Headers', () => {
  it('OPTIONS request should include CORS headers', async () => {
    const res = await request(app)
      .options('/api/v1/health')
      .set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});

describe('Security Headers', () => {
  it('Response should include helmet headers', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(['DENY', 'SAMEORIGIN']).toContain(res.headers['x-frame-options']);
  });
});

describe('Rate Limiting Headers', () => {
  it('Response should include rate limit headers', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers).toHaveProperty('x-ratelimit-limit');
    expect(res.headers).toHaveProperty('x-ratelimit-remaining');
  });
});

describe('Snowflake Validation', () => {
  it('API should return 401 without valid auth (snowflake check is behind auth)', async () => {
    const res = await request(app)
      .get('/api/v1/public/users/abc')
      .set('x-api-key', 'test');
    expect(res.status).toBe(401);
  });
});
