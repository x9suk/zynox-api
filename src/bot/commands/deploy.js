const { REST, Routes } = require('discord.js');
const config = require('../../config/env');
const logger = require('../../utils/logger');

const commands = [
  {
    name: 'ping',
    description: 'Check bot latency and API ping',
  },
  {
    name: 'stats',
    description: 'Display bot statistics',
  },
  {
    name: 'invite',
    description: 'Get the bot invite link',
  },
  {
    name: 'api-status',
    description: 'Show API server, MongoDB, Redis, and bot health status',
  },
  {
    name: 'api-stats',
    description: 'Show bot stats: guild count, users, memory, uptime',
  },
  {
    name: 'api-guild',
    description: 'Show tracking stats for the current guild',
  },
  {
    name: 'api-docs',
    description: 'Show API documentation links and examples',
  },
  {
    name: 'api-help',
    description: 'Show all available Zynox bot commands',
  },
  {
    name: 'api-invite',
    description: 'Get the bot invite link with required scopes',
  },
  {
    name: 'api-user',
    description: 'Look up a Discord user profile',
    options: [{
      name: 'id',
      description: 'Discord user ID (snowflake)',
      type: 3,
      required: true,
    }],
  },
  {
    name: 'api-presence',
    description: 'Show current presence for a Discord user',
    options: [{
      name: 'id',
      description: 'Discord user ID (snowflake)',
      type: 3,
      required: true,
    }],
  },
  {
    name: 'api-bot',
    description: 'Show stats for a tracked bot',
    options: [{
      name: 'id',
      description: 'Bot ID (snowflake)',
      type: 3,
      required: true,
    }],
  },
  {
    name: 'api-usage',
    description: 'Show your API usage today and plan limits',
  },
  {
    name: 'api-timeline',
    description: 'Show recent presence history for a Discord user',
    options: [
      {
        name: 'id',
        description: 'Discord user ID (snowflake)',
        type: 3,
        required: true,
      },
      {
        name: 'limit',
        description: 'Number of records (1-25, default 5)',
        type: 4,
        required: false,
      },
    ],
  },
  {
    name: 'api-keys',
    description: 'Show your active API key count and recent keys',
  },
  {
    name: 'webhook-test',
    description: 'Send a test webhook to your configured webhook URLs',
  },
  {
    name: 'admin-stats',
    description: '[Admin] Show platform statistics',
  },
  {
    name: 'admin-plan',
    description: '[Admin] Change a developer plan',
    options: [
      { name: 'user', description: 'Discord user ID', type: 3, required: true },
      { name: 'plan', description: 'New plan', type: 3, required: true, choices: [
        { name: 'Free', value: 'free' },
        { name: 'Pro', value: 'pro' },
        { name: 'Enterprise', value: 'enterprise' },
      ]},
    ],
  },
  {
    name: 'admin-ban',
    description: '[Admin] Ban a developer and revoke keys',
    options: [
      { name: 'user', description: 'Discord user ID', type: 3, required: true },
      { name: 'reason', description: 'Ban reason', type: 3, required: false },
    ],
  },
  {
    name: 'admin-unban',
    description: '[Admin] Unban a developer',
    options: [
      { name: 'user', description: 'Discord user ID', type: 3, required: true },
    ],
  },
  {
    name: 'owner-stats',
    description: '[Owner] Show platform statistics',
  },
  {
    name: 'owner-health',
    description: '[Owner] Show bot and system health details',
  },
  {
    name: 'owner-devs',
    description: '[Owner] List all developers',
    options: [{
      name: 'page',
      description: 'Page number (default 1)',
      type: 4,
      required: false,
    }],
  },
  {
    name: 'owner-ban',
    description: '[Owner] Ban a developer and optionally revoke API keys',
    options: [
      { name: 'user', description: 'Discord user ID', type: 3, required: true },
      { name: 'reason', description: 'Ban reason', type: 3, required: false },
      { name: 'revoke_keys', description: 'Revoke all API keys (default true)', type: 5, required: false },
    ],
  },
  {
    name: 'owner-unban',
    description: '[Owner] Unban a developer',
    options: [
      { name: 'user', description: 'Discord user ID', type: 3, required: true },
    ],
  },
  {
    name: 'owner-plan',
    description: '[Owner] Change a developer plan',
    options: [
      { name: 'user', description: 'Discord user ID', type: 3, required: true },
      { name: 'plan', description: 'New plan', type: 3, required: true, choices: [
        { name: 'Free', value: 'free' },
        { name: 'Pro', value: 'pro' },
        { name: 'Enterprise', value: 'enterprise' },
      ]},
    ],
  },
  {
    name: 'owner-cache',
    description: '[Owner] View or flush Redis cache',
    options: [
      { name: 'action', description: 'Action: stats or flush', type: 3, required: false },
      { name: 'group', description: 'Group to flush (presence, bot, guild, ratelimit, all)', type: 3, required: false },
    ],
  },
  {
    name: 'owner-maintenance',
    description: '[Owner] Enable or disable maintenance mode',
    options: [{
      name: 'action',
      description: 'on or off',
      type: 3,
      required: true,
    }],
  },
  {
    name: 'owner-logs',
    description: '[Owner] Show recent owner audit logs',
  },
  {
    name: 'owner-reload',
    description: '[Owner] Reload command registry',
  },
  {
    name: 'test-user',
    description: 'Show user tracking data for self or a mentioned user',
    options: [{
      name: 'target',
      description: 'User to look up (defaults to yourself)',
      type: 6,
      required: false,
    }],
  },
  {
    name: 'test-guild',
    description: 'Show tracking data for this guild',
  },
  {
    name: 'test-bot',
    description: 'Show bot self-check and Redis cache data',
  },
  {
    name: 'analytics',
    description: 'Show your API usage analytics summary',
  },
  {
    name: 'status',
    description: 'Show comprehensive system health status',
  },
  {
    name: 'help',
    description: 'Show all bot commands organized by category',
  },
];

async function deployCommands() {
  try {
    const rest = new REST({ version: '10' }).setToken(config.discord.botToken);
    const clientId = config.discord.clientId;
    const guildId = config.discord.guildId;
    const isGuild = !!guildId;

    const route = isGuild
      ? Routes.applicationGuildCommands(clientId, guildId)
      : Routes.applicationCommands(clientId);

    const names = commands.map(c => `/${c.name}`).join(', ');
    logger.info({
      clientId,
      guildId: guildId || undefined,
      target: isGuild ? 'guild' : 'global',
      commands: names,
    }, 'Registering slash commands...');

    const result = await rest.put(route, { body: commands });

    logger.info({
      clientId,
      guildId: guildId || undefined,
      count: result.length,
      target: isGuild ? 'guild' : 'global',
      commands: names,
    }, 'Slash commands registered successfully');
    return result;
  } catch (err) {
    logger.warn({ err }, 'Failed to register slash commands (non-fatal)');
  }
}

module.exports = { deployCommands, commands };
