# Zynox Tracking API — Security Documentation

## Overview

Zynox Tracking API is designed with security as a core principle. This document outlines the security measures implemented.

---

## API Key Security

### Key Generation
- API keys use `nanoid(48)` which generates 48-character cryptographically random strings
- Key format: `{prefix}_{random}` (e.g., `zynox_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2w3X4y5Z6`)
- Prefix is derived from the first 5 characters of the random portion for identification

### Key Storage
- **Only SHA-256 hashes are stored in MongoDB**
- The raw key is displayed **only once** at creation time
- Regenerating a key creates a new hash and invalidates the old one
- No key logging — keys are never written to logs

```js
// Hashing (SHA-256)
const crypto = require('crypto');
function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}
```

### Key Verification
- Incoming keys are hashed and compared to stored hashes
- Timing-safe comparison is used where applicable
- Failed auth attempts increment an abuse score

### Key Expiry
- Keys can have an optional `expiresAt` field
- Expired keys are rejected during authentication (checked before scope/rate limit)
- A background scheduler runs every 15 minutes to clean up expired keys
- Keys can be rotated (extended) via `POST /developer/keys/:id/rotate`

---

## Authentication

### Discord OAuth2
- Uses Discord's official OAuth2 flow with `identify`, `guilds`, and `email` scopes
- Access tokens are exchanged server-side and never exposed to the client
- JWTs are signed with a configurable secret (default 64+ chars)
- JWT expiration: configurable (default 7 days)

### JWT Security
- Tokens are signed with `HS256` using a strong secret
- Payload includes: `sub` (developer ID), `discordId`, `username`, `role`, `plan`
- No sensitive data in JWT payload
- Tokens expire and must be refreshed

### Socket.IO Authentication
- WebSocket connections authenticate via API key in the handshake query
- Connections are rejected before any events are processed if the key is invalid

---

## Webhook Security

### HMAC-SHA256 Signing
- Every webhook payload is signed with an HMAC-SHA256 signature
- Each API key has its own `webhookSecret` for signing
- The signature is sent in the `X-Zynox-Signature` header:

```
X-Zynox-Signature: sha256=<hex-encoded-hmac>
```

### Verification (Receiver Side)
```js
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

### Retry Policy
- Failed deliveries are retried up to 3 times
- Exponential backoff: 5s, 30s, 120s
- Each attempt has a 10-second timeout
- No persistent storage of undelivered webhooks

### Stripe Webhook
- The Stripe webhook endpoint (`POST /stripe/webhook`) uses `express.raw()` body parser
- The raw body is required for Stripe's HMAC signature verification
- Only valid Stripe-signed events are processed
- Subscription lifecycle events (created, updated, deleted) automatically upgrade or downgrade developer plans

---

## Rate Limiting & Abuse Prevention

### Three-layer rate limiting

| Layer | Scope | Limit | Technology |
|-------|-------|-------|------------|
| Global IP | Per IP | 60 req/min (configurable) | In-memory + Redis |
| API Key (per-minute) | Per key | Varies by plan (10/60/300) | Redis sorted set (sliding window) |
| API Key (daily) | Per key | Varies by plan (100/10k/100k) | Redis hash (resets at midnight) |

### Rate Limit Alerts
- When a key reaches 80% of its daily limit, a warning is logged
- Alerts are deduplicated — only one alert per hour per key
- This provides early warning before hitting the hard daily cap

### Abuse Detection

The abuse service tracks:
- **Failed auth attempts** — 5 failures within 5 minutes from the same IP triggers a temporary block
- **Suspicious requests** — scope mismatches, rate limit violations, etc.
- **IP blocks** — automatic 15-minute blocks after threshold exceeded

```env
ABUSE_FAILED_AUTH_LIMIT=5        # Failed auth attempts before block
ABUSE_FAILED_AUTH_WINDOW=300     # Window in seconds
ABUSE_IP_BLOCK_THRESHOLD=20      # Suspicious score before block
ABUSE_IP_BLOCK_DURATION=900      # Block duration in seconds (15 min)
```

---

## Data Protection

### What We Store
- **MongoDB:** User profiles, presence history, bot/guild stat snapshots, API key hashes, developer accounts
- **Redis:** Current presence, current bot/guild stats, voice states, socket sessions, rate limit counters

### What We NEVER Store
- Discord access tokens (exchanged and discarded after OAuth2)
- Raw API keys (hashed before storage)
- Private Discord data (emails, DMs, messages)
- User passwords (Discord OAuth2 only)
- Credit card info or billing details (Stripe handles all payment data)

### What We NEVER Expose
- Discord bot tokens (config only, never in responses)
- API key hashes (only the prefix is shown)
- Private guild data (channels, roles, member lists beyond counts)
- Internal IPs or infrastructure details
- Message **content** (only per-guild message *counts* are tracked for analytics)

### Batch Endpoint Privacy
- Batch endpoints (`POST /public/*/batch`) return `null` for any ID not found in the cache or database
- They do not distinguish between "not tracked" and "does not exist" — preventing user enumeration
- Maximum 100 IDs per request prevents abuse
- Same scope and rate limit enforcement as single endpoints

---

## HTTP Security Headers

All responses include security headers via Helmet:

```
Content-Security-Policy
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
Strict-Transport-Security: max-age=15552000
```

---

## CORS

CORS is restricted to configured origins:

```env
CORS_ORIGIN=https://your-frontend.com,http://localhost:5173
```

Only `GET`, `POST`, `PUT`, `PATCH`, `DELETE` methods are allowed.
Allowed headers: `Content-Type`, `Authorization`, `X-API-Key`.

---

## Input Validation

All inputs are validated:
- Discord snowflakes must be 17-20 digit strings
- API key names are limited to 100 characters
- Scopes must be from a predefined list
- Request body sizes are limited to 1MB
- Batch endpoint `ids` array must be 1-100 items, each a valid snowflake
- Analytics export period must be one of: `today`, `7d`, `30d`
- Plan changes must be one of: `free`, `pro`, `enterprise`
- Key rotation `days` parameter must be a positive integer

---

## Bot Health Monitoring

The bot health service tracks:
- Connection status (connected / reconnecting / disconnected)
- Reconnect attempts with exponential backoff (1s → 60s max)
- Unstable flag activated when >5 disconnects occur within 10 minutes
- Status accessible via `GET /api/v1/health/bot`

If the bot becomes unstable, a flag is set in Redis with a 10-minute TTL.

---

## Error Handling

- Stack traces are only exposed in development mode
- Production errors return generic messages
- All errors are logged with structured JSON
- Webhook delivery errors are logged but do not affect API responses
- Slash command errors are caught and logged gracefully

---

## Environment Variables

- Sensitive values (tokens, secrets) are never hardcoded
- `.env` file is excluded from version control via `.gitignore`
- Production uses environment variables set on the server
- Stripe keys are only required if billing is enabled

---

## Dependencies

- All packages are actively maintained
- `npm audit` runs regularly
- Unused dependencies are removed
- Express is pinned to v4 for stability

---

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it by:
- Opening a private issue in the repository
- Emailing the project maintainer
- Do **not** disclose publicly until patched
