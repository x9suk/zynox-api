# Zynox Tracking API — Deployment Guide

## Production Deployment

### Environment

Set `NODE_ENV=production` in your `.env` file.

### Process Manager

Use PM2 (included via `ecosystem.config.js`):

```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

### Docker

```bash
docker build -t zynox-tracking-api .
docker run -d -p 3000:3000 --env-file .env --name zynox-api zynox-tracking-api
```

### Docker Compose

```bash
docker-compose up -d
```

### Reverse Proxy (Nginx)

A sample Nginx config is provided at `nginx/zynox-tracking-api.conf`.

### Security Checklist

- [ ] JWT secret changed to a random 64+ char string
- [ ] Stripe webhook secret configured
- [ ] MongoDB Atlas IP whitelist set
- [ ] Redis password set and TLS enabled
- [ ] CORS origins restricted
- [ ] Rate limits tuned for expected traffic
- [ ] Bot token kept private
- [ ] `NODE_ENV=production`
