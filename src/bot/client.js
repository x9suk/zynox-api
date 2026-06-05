const { Client, GatewayIntentBits, Partials } = require('discord.js');
const config = require('../config/env');
const logger = require('../utils/logger');
const { startMonitoring, stopMonitoring } = require('../services/botHealth.service');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildEmojisAndStickers,
  ],
  partials: [
    Partials.GuildMember,
    Partials.User,
    Partials.Channel,
  ],
  presence: {
    activities: [{
      name: 'Zynox Tracking API',
      type: 0,
    }],
    status: 'online',
  },
  failIfNotExists: false,
  rest: {
    retries: 3,
    timeout: 15000,
  },
});

client.on('error', (err) => {
  logger.error({ err }, 'Discord client error');
});

client.on('warn', (warning) => {
  logger.warn({ warning }, 'Discord client warning');
});

client.on('rateLimit', (info) => {
  logger.warn({
    timeout: info.timeout,
    limit: info.limit,
    method: info.method,
    path: info.path,
    route: info.route,
  }, 'Discord rate limit hit');
});

async function startBot() {
  if (!config.discord.botToken || config.discord.botToken === 'test_bot_token') {
    logger.warn('Discord bot token not configured. Bot will not start.');
    return null;
  }

  try {
    await client.login(config.discord.botToken);
    startMonitoring(client);
    logger.info('Discord bot logged in successfully');
    return client;
  } catch (err) {
    logger.fatal({ err }, 'Failed to login Discord bot');
    return null;
  }
}

async function stopBot() {
  try {
    stopMonitoring();
    client.destroy();
    logger.info('Discord bot destroyed');
  } catch (err) {
    logger.warn({ err }, 'Error destroying Discord bot');
  }
}

module.exports = { client, startBot, stopBot };
