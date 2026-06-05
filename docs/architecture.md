# Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Discord    │────▶│  Discord.js  │────▶│   Express   │
│  Gateway    │     │  Bot Client  │     │   API       │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                │
                    ┌───────────────────────────┼───────────┐
                    ▼                           ▼           ▼
            ┌────────────┐            ┌────────────┐ ┌──────────┐
            │   Redis    │            │  MongoDB   │ │  Socket  │
            │   Cache    │            │  History   │ │   .IO    │
            └────────────┘            └────────────┘ └──────────┘
```

## Layers

- **Gateway Layer** — Discord.js bot tracking presence, guilds, and messages
- **API Layer** — Express REST API with rate limiting, auth, and validation
- **Cache Layer** — Redis for real-time presence, rate limits, and fast lookups
- **Persistence Layer** — MongoDB for developer data, API keys, analytics, audit logs
- **Realtime Layer** — Socket.IO for live streaming of presence events
- **Billing Layer** — Stripe integration for subscription management
