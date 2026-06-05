const { getRedis } = require('../../config/redis');
const config = require('../../config/env');
const logger = require('../../utils/logger');
const { commandMap } = require('./interactionCreate');
const { handlePrefixOwnerCommand } = require('../owner/prefixHandler');

const p = config.redis.prefix;
const OWNER_PREFIX = config.bot.prefix;
const PREFIX = '!';

function buildArgs(message) {
  const parts = message.content.split(/\s+/);
  return parts.slice(1);
}

function createShimInteraction(message, commandName, args) {
  let replied = false;
  let deferred = false;
  let replyMessage = null;

  const shim = {
    commandName,
    user: message.author,
    member: message.member,
    client: message.client,
    guild: message.guild,
    channel: message.channel,
    createdTimestamp: message.createdTimestamp,
    replied: false,
    deferred: false,

    isChatInputCommand: () => true,
    isCommand: () => true,

    reply: async (content) => {
      replied = true;
      shim.replied = true;

      if (typeof content === 'string') {
        replyMessage = await message.reply(content);
        return replyMessage;
      }

      const opts = {};
      if (content.content) opts.content = content.content;
      if (content.embeds) opts.embeds = content.embeds;
      if (content.components) opts.components = content.components;
      if (content.fetchReply) opts.fetchReply = content.fetchReply;
      if (content.files) opts.files = content.files;

      replyMessage = await message.reply(opts);
      return replyMessage;
    },

    editReply: async (content) => {
      if (replyMessage) {
        if (typeof content === 'string') {
          return replyMessage.edit(content);
        }
        const opts = {};
        if (content.content) opts.content = content.content;
        if (content.embeds) opts.embeds = content.embeds;
        if (content.components) opts.components = content.components;
        if (content.files) opts.files = content.files;
        return replyMessage.edit(opts);
      }

      if (typeof content === 'string') {
        return message.channel.send(content);
      }
      const opts = {};
      if (content.content) opts.content = content.content;
      if (content.embeds) opts.embeds = content.embeds;
      if (content.components) opts.components = content.components;
      if (content.files) opts.files = content.files;
      return message.channel.send(opts);
    },

    deferReply: async () => {
      deferred = true;
      shim.deferred = true;
    },

    followUp: async (content) => {
      if (typeof content === 'string') {
        return message.channel.send(content);
      }
      const opts = {};
      if (content.content) opts.content = content.content;
      if (content.embeds) opts.embeds = content.embeds;
      if (content.components) opts.components = content.components;
      return message.channel.send(opts);
    },

    options: {
      getString: (name) => {
        const posMap = {
          id: 0, user: 0, target: 0,
          plan: 1, reason: 1, limit: 1,
        };
        const idx = posMap[name];
        if (idx === undefined || idx >= args.length) return null;
        return args[idx];
      },
      getInteger: (name) => {
        const posMap = {
          id: 0, user: 0, target: 0,
          plan: 1, reason: 1, limit: 1,
        };
        const idx = posMap[name];
        if (idx === undefined || idx >= args.length) return null;
        const n = parseInt(args[idx], 10);
        return isNaN(n) ? null : n;
      },
      getUser: (name) => {
        const posMap = {
          id: 0, user: 0, target: 0,
          plan: 1, reason: 1, limit: 1,
        };
        const idx = posMap[name];
        if (idx === undefined || idx >= args.length) return null;
        const val = args[idx];
        if (!val) return null;
        const match = val.match(/^<@!?(\d+)>$/);
        const id = match ? match[1] : val;
        return message.client.users.cache.get(id) || null;
      },
    },
  };

  return shim;
}

async function messageCreateHandler(message) {
  if (message.author.bot) return;
  if (!message.guild) return;

  try {
    const redis = await getRedis();
    const key = `${p}messages:guild:${message.guild.id}`;
    const multi = redis.multi();
    multi.incr(key);
    multi.expire(key, 86400);
    await multi.exec();
  } catch (err) {
    logger.error({ err, guildId: message.guild.id }, 'Failed to track message count');
  }

  const startsWithOwnerPrefix = message.content.startsWith(OWNER_PREFIX);
  const startsWithRegularPrefix = message.content.startsWith(PREFIX);

  if (startsWithOwnerPrefix) {
    await handlePrefixOwnerCommand(message);
    return;
  }

  if (!startsWithRegularPrefix) return;

  const args = buildArgs(message);
  const commandName = message.content.slice(PREFIX.length).split(/\s+/)[0].toLowerCase();

  const handler = commandMap[commandName];
  if (!handler) return;

  const shim = createShimInteraction(message, commandName, args);

  try {
    await handler(shim);
  } catch (err) {
    logger.error({ err, command: commandName }, 'Prefix command execution error');
    const content = 'An error occurred while executing the command.';
    try {
      if (shim.replied || shim.deferred) {
        await shim.editReply({ content }).catch(() => {});
      } else {
        await shim.reply({ content, ephemeral: true }).catch(() => {});
      }
    } catch {
      // ignore
    }
  }
}

module.exports = messageCreateHandler;
