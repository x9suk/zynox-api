# Zynox Tracking API — Setup Guide

## Prerequisites

- Node.js 18+ 
- MongoDB 6+ (local or Atlas)
- Redis 6+ (local or cloud)
- Discord Developer Application

---

## 1. Discord Developer Portal Setup

1. Go to [https://discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application** → name it **Zynox**
3. Go to **Bot** tab:
   - Click **Reset Token** → copy the token
   - Enable these **Privileged Gateway Intents**:
     - ✅ **PRESENCE INTENT** — required for presence tracking
     - ✅ **SERVER MEMBERS INTENT** — required for member join/leave tracking
     - ✅ **MESSAGE CONTENT INTENT** — (optional, for future commands)
4. Go to **OAuth2 → General**:
   - Add redirect URL: `http://localhost:3000/api/v1/auth/discord/callback`
   - Copy **Client ID** and **Client Secret**
5. Go to **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot permissions: `Read Messages`, `Send Messages`, `Read Message History`, `Use Slash Commands` (minimum)
   - Use generated URL to invite the bot to your server

### Intent Descriptions

| Intent | Purpose |
|--------|---------|
| `Guilds` | Track guild create/delete events |
| `GuildMembers` | Track member join/leave events |
| `GuildPresences` | Track online/idle/dnd/offline status and activities |
| `GuildVoiceStates` | Track voice channel join/leave/move |

---

## 2. Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Description |
|----------|-------------|
| `DISCORD_CLIENT_ID` | From Discord Developer Portal → OAuth2 |
| `DISCORD_CLIENT_SECRET` | From Discord Developer Portal → OAuth2 |
| `DISCORD_BOT_TOKEN` | From Discord Developer Portal → Bot |
| `DISCORD_REDIRECT_URI` | `http://localhost:3000/api/v1/auth/discord/callback` |
| `JWT_SECRET` | Generate: `openssl rand -hex 64` |
| `MONGODB_URI` | `mongodb://localhost:27017/zynox_tracking` |
| `REDIS_HOST` | `localhost` |
| `REDIS_PORT` | `6379` |

---

## 3. MongoDB Setup

### Local (recommended for development)

```bash
# Windows (with MongoDB installed)
mongod --dbpath C:\data\db

# Verify
mongosh
> use zynox_tracking
> db.createCollection('init')
```

### MongoDB Atlas (production)

1. Create a free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create a database user
3. Whitelist your IP
4. Copy connection string to `MONGODB_URI`

---

## 4. Redis Setup

### Local (Windows)

Download from [redis.io/download](https://redis.io/download) or use WSL:

```bash
# WSL
sudo apt install redis-server
sudo service redis-server start

# Verify
redis-cli ping
# PONG
```

### Redis Cloud (production)

1. Create account at [redis.com](https://redis.com)
2. Create a free database
3. Copy host, port, password to `.env`

---

## 5. Install & Run

```bash
# Install dependencies
npm install

# Copy environment
cp .env.example .env
# Edit .env with your values

# Run in development
npm run dev

# Run in production
npm start
```

Verify the server is running:

```bash
curl http://localhost:3000/api/v1/health
# {"status":"ok","timestamp":"...","uptime":...}

curl http://localhost:3000/api/v1/health/ready
# {"status":"ok","checks":{"server":true,"database":true,"redis":true}}
```

---

## 6. First Run Checklist

- [ ] Discord bot shows as online in your server
- [ ] `/api/v1/health/ready` returns all checks green
- [ ] Visit `/api/v1/auth/discord/login` in browser → redirects to Discord
- [ ] After login, you receive a JWT token
- [ ] Create an API key via `POST /api/v1/developer/keys`
- [ ] Test public endpoint: `curl -H "x-api-key: zynox_..." http://localhost:3000/api/v1/public/bots/:id/stats`

---

## Troubleshooting

**Bot doesn't come online**
- Check `DISCORD_BOT_TOKEN` in `.env`
- Ensure bot is invited to at least one guild
- Check intents are enabled in Developer Portal

**Presence data not showing**
- Ensure `PRESENCE INTENT` is enabled
- Bot must be in the guild where the user is

**"Missing environment variables"**
- Copy `.env.example` to `.env` and fill all values

**Rate limited by Discord**
- The bot automatically handles rate limits
- Reduce bot concurrency if needed
