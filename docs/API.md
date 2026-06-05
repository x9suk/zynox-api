# API Reference

Base URL: `http://localhost:3000/api/v1`

## Authentication

- **API Key**: Pass via `x-api-key` header
- **JWT**: Pass via `Authorization: Bearer <token>` header

## Endpoints

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Server health status |
| GET | `/health/ready` | Readiness check |

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/public/users/:id` | User presence and profile |
| GET | `/public/bots/:id` | Bot stats |
| GET | `/public/guilds/:id` | Guild tracking data |
| GET | `/public/presence/:id` | Current presence |
| GET | `/public/presence/:id/timeline` | Presence history |

### Developer

| Method | Path | Description |
|--------|------|-------------|
| GET | `/developer/profile` | Get developer profile |
| GET | `/developer/keys` | List API keys |
| POST | `/developer/keys` | Create API key |
| DELETE | `/developer/keys/:id` | Revoke API key |
| POST | `/developer/keys/:id/rotate` | Rotate API key |
| GET | `/developer/usage` | Daily usage stats |
| GET | `/developer/analytics` | Usage analytics |
| GET | `/developer/webhooks` | List webhooks |
| POST | `/developer/webhooks` | Create webhook |
| DELETE | `/developer/webhooks/:id` | Delete webhook |
| POST | `/developer/webhooks/:id/test` | Test webhook |

### Admin

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/stats` | Platform statistics |
| GET | `/admin/developers` | List developers |
| GET | `/admin/developers/:id` | Developer details |
| POST | `/admin/developers/:id/ban` | Ban developer |
| POST | `/admin/developers/:id/unban` | Unban developer |
| PATCH | `/admin/developers/:id/plan` | Change plan |

### Auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/discord` | Discord OAuth2 login |
| GET | `/auth/discord/callback` | OAuth2 callback |
| GET | `/auth/refresh` | Refresh JWT token |
| DELETE | `/auth/session` | Logout |

### Billing

| Method | Path | Description |
|--------|------|-------------|
| GET | `/billing/plans` | List plans |
| GET | `/billing/subscription` | Current subscription |
| POST | `/billing/create-checkout` | Create checkout session |
| POST | `/billing/create-portal` | Customer portal |
| POST | `/billing/webhook` | Stripe webhook |
