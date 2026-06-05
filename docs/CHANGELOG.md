# Changelog

## v2.0.0 (2026-06-04)

### New Features

- **Batch API Endpoints** — `POST /public/users/batch`, `/bots/batch`, `/guilds/batch` (max 100 IDs each)
- **User Presence Timeline** — `GET /public/users/:id/timeline` returns historical presence snapshots from MongoDB
- **Analytics Export** — `GET /developer/analytics` (overview) and `GET /developer/analytics/export?format=csv|json&period=today|7d|30d`
- **Webhook Delivery** — Real-time HTTP callbacks for presence, bot, guild, member, and voice events; HMAC-SHA256 signed; 3× retry
- **Webhook Testing** — `POST /developer/keys/:id/test-webhook` sends a test payload to the configured URL
- **Admin Panel** (backend) — `GET /admin/developers` (list/search/filter), `GET /developers/:id` (detail+keys), `POST /:id/ban|unban`, `PATCH /:id/plan`, `GET /admin/stats`
- **Stripe Billing** — `POST /stripe/create-checkout` (checkout session), `POST /stripe/webhook` (auto-upgrade/downgrade on subscription lifecycle events)
- **Slash Commands** — `/ping` (latency), `/stats` (guilds/users/uptime/memory), `/invite` (invite link)
- **More Gateway Events** — Message tracking (per-guild atomic counter), channel create/delete (triggers stat recache), emoji count (30s debounced)
- **Bot Health Monitoring** — Reconnect tracking with exponential backoff (1s→60s), unstable flag (>5 disconnects in 10 min)
- **Rate Limit Alerts** — Logger warning at 80% daily usage, deduplicated 1/hour per key
- **Key Expiry / Auto-Rotation** — `expiresAt` field on API keys, `POST /:id/rotate` to extend by N days, scheduler cleans expired keys every 15 min
- **Brand Rename** — Zyrox → Zynox across all code, docs, config, and Docker assets

### Bug Fixes

- Interval pile-up on bot reconnect (clear old intervals before creating new ones)
- `stopMonitoring()` not properly cleaning up Discord client listeners
- `cacheAllGuildStats()` running sequentially (now at concurrency 10)
- `scheduler.stop()` missing (now properly stops key expiry cron)
- `messageCreate` atomicity (now uses `multi()` transaction)
- Webhook delivery timeout leak (now uses `clearTimeout` in both paths)
- `getUsersBatch()` running sequentially (now uses `Promise.all`)
- Emoji update write spam (now debounced with 30s Redis key)
- `deployCommands` throwing on failed registration (now caught gracefully)
- Stale "Zyrox" branding in presence activity state strings

### Security

- Webhook payloads signed with HMAC-SHA256 using per-key `webhookSecret`
- Batch endpoints respect same scope requirements as single endpoints
- Stripe webhook endpoint uses `express.raw()` body parser (required for signature verification)
- Old `zyrox_` key prefix continues to work (hash-based auth, prefix is cosmetic)
- New keys get `zynox_` prefix

### Environment Variables (new)

- `STRIPE_SECRET_KEY` — Stripe secret key for billing
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `STRIPE_PRICE_PRO` — Stripe price ID for Pro plan
- `STRIPE_PRICE_ENTERPRISE` — Stripe price ID for Enterprise plan
- `DISCORD_INVITE_URL` — Custom invite URL for the /invite slash command

---

## v1.0.0 (2026-05-01)

Initial release as Zyrox Tracking API.

- Discord OAuth2 developer login
- API key system (SHA-256 hashed, scoped)
- Three plan tiers (Free, Pro, Enterprise)
- Real-time presence tracking
- Bot stats and guild stats
- Socket.IO streaming (presence, bot, guild, member, voice events)
- IP and key rate limiting (Redis-backed sliding window)
- Abuse detection and automatic IP blocking
- Helmet security headers, CORS, input validation
