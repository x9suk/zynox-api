const config = require('../../config/env');
const {
  handleStats, handleDevs, handleBan, handleUnban, handlePlan,
  handleCache, handleMaintenance, handleLogs, handleReload, handleHealth,
} = require('./ownerHandlers');

const handlerMap = {
  stats: handleStats,
  health: handleHealth,
  devs: handleDevs,
  ban: handleBan,
  unban: handleUnban,
  plan: handlePlan,
  cache: handleCache,
  maintenance: handleMaintenance,
  logs: handleLogs,
  reload: handleReload,
};

function parseArgs(str) {
  const args = [];
  let current = '';
  let inQuote = false;

  for (const ch of str) {
    if (ch === '"' || ch === "'") { inQuote = !inQuote; continue; }
    if (ch === ' ' && !inQuote) {
      if (current) { args.push(current); current = ''; }
    } else {
      current += ch;
    }
  }
  if (current) args.push(current);
  return args;
}

async function handlePrefixOwnerCommand(message) {
  const prefix = config.bot.prefix;
  if (!message.content.startsWith(prefix)) return;

  const raw = message.content.slice(prefix.length).trim();
  const parts = raw.split(/\s+/);
  const cmd = parts[0]?.toLowerCase();

  if (!config.bot.ownerIds.includes(message.author.id)) return;

  const handler = handlerMap[cmd];
  if (!handler) return;

  const rest = parts.slice(1).join(' ');
  const parsed = parseArgs(rest);

  const ctx = {
    user: message.author,
    client: message.client,
    reply: async (opts) => {
      if (opts && opts.embeds) {
        await message.channel.send({ embeds: opts.embeds });
      } else if (opts && opts.content) {
        await message.channel.send({ content: opts.content });
      } else {
        await message.channel.send({ content: String(opts) });
      }
    },
    options: {
      getString: (name) => {
        const map = {
          user: parsed[0] || null,
          reason: parsed[1] || null,
          plan: parsed[1] || null,
          action: parsed[0] || null,
          group: parsed[1] || null,
        };
        return map[name] || null;
      },
      getInteger: (name) => {
        if (name === 'page') return parseInt(parsed[0], 10) || 1;
        return null;
      },
      getBoolean: (name) => {
        if (name === 'revoke_keys') return parsed[2] !== 'false';
        return null;
      },
    },
  };

  await handler(ctx);
}

module.exports = { handlePrefixOwnerCommand };
