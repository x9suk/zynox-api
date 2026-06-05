const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const required = [
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'DISCORD_BOT_TOKEN',
  'DISCORD_REDIRECT_URI',
  'JWT_SECRET',
  'MONGODB_URI',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required environment variables:\n  ${missing.join('\n  ')}`);
  console.error('Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

const config = {
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    botToken: process.env.DISCORD_BOT_TOKEN,
    redirectUri: process.env.DISCORD_REDIRECT_URI,
    apiBase: process.env.DISCORD_API_BASE || 'https://discord.com/api/v10',
    inviteUrl: process.env.DISCORD_INVITE_URL || '',
    guildId: process.env.DISCORD_GUILD_ID || '',
  },
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
    isDev: (process.env.NODE_ENV || 'development') === 'development',
    isProd: process.env.NODE_ENV === 'production',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  mongodb: {
    uri: process.env.MONGODB_URI,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    username: process.env.REDIS_USERNAME || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    prefix: process.env.REDIS_PREFIX || 'zynox:',
    tlsEnabled: process.env.REDIS_TLS === 'true',
  },
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
      .split(',')
      .map((s) => s.trim()),
  },
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 60,
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
  },
  apiKey: {
    enabled: process.env.API_KEY_ENABLED !== 'false',
  },
  abuse: {
    failedAuthLimit: parseInt(process.env.ABUSE_FAILED_AUTH_LIMIT, 10) || 5,
    failedAuthWindow: parseInt(process.env.ABUSE_FAILED_AUTH_WINDOW, 10) || 300,
    ipBlockThreshold: parseInt(process.env.ABUSE_IP_BLOCK_THRESHOLD, 10) || 20,
    ipBlockDuration: parseInt(process.env.ABUSE_IP_BLOCK_DURATION, 10) || 900,
    suspiciousScoreLimit: parseInt(process.env.ABUSE_SUSPICIOUS_SCORE_LIMIT, 10) || 50,
    suspiciousWindow: parseInt(process.env.ABUSE_SUSPICIOUS_WINDOW, 10) || 600,
  },
  planDefaults: {
    free: { dailyLimit: 100, maxKeys: 5, rateLimitPerMinute: 10 },
    pro: { dailyLimit: 10000, maxKeys: 25, rateLimitPerMinute: 60 },
    enterprise: { dailyLimit: 100000, maxKeys: 100, rateLimitPerMinute: 300 },
  },
  bot: {
    ownerIds: (process.env.BOT_OWNER_IDS || '742415554840887337,869716921283653693')
      .split(',').map(s => s.trim()).filter(Boolean),
    prefix: process.env.BOT_PREFIX || ';',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    priceIds: {
      pro: process.env.STRIPE_PRICE_PRO || '',
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE || '',
    },
  },
};

module.exports = config;
