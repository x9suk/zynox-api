# Zynox Tracking API

Public Discord tracking API platform with Discord OAuth2, API keys, Redis cache, MongoDB history, Socket.IO realtime, webhooks, Stripe billing, admin controls, and bot gateway tracking.

## Features

- **Discord OAuth2** — Authenticate developers via Discord
- **API Key Management** — Create, rotate, revoke scoped API keys
- **Redis Cache** — Presence, bot, guild, and rate-limit caching
- **MongoDB History** — Persistent tracking and analytics data
- **Socket.IO Realtime** — Live presence and event streaming
- **Webhooks** — Event-driven delivery to developer endpoints
- **Stripe Billing** — Subscription plans (Free, Pro, Enterprise)
- **Admin Controls** — Developer ban/unban, plan changes, platform stats
- **Bot Gateway** — Discord.js bot with slash and prefix commands
- **Owner Commands** — System health, cache management, maintenance mode, audit logs

## Quick Start

```bash
cp .env.example .env
# Edit .env with your Discord credentials and MongoDB URI
npm install
npm run dev
```

## Bot Commands

| Prefix | Scope |
|--------|-------|
| `/` | Slash commands (all users) |
| `!` | Prefix commands (all users) |
| `;` | Owner prefix commands (owners only) |

See `;help` or `/help` in Discord for the full command list.

## Documentation

- [API Reference](docs/API.md)
- [Setup Guide](docs/SETUP.md)
- [WebSocket Guide](docs/WEBSOCKET.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Architecture](docs/architecture.md)
- [Webhook Guide](docs/webhooks.md)
- [Security](docs/SECURITY.md)
- [Changelog](docs/CHANGELOG.md)

## License

MIT
