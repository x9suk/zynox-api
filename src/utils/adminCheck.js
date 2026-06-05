const Developer = require('../models/Developer');
const config = require('../config/env');

async function isAdmin(discordId) {
  if (config.bot.ownerIds.includes(discordId)) return true;
  const dev = await Developer.findByDiscordId(discordId);
  return dev && (dev.role === 'admin' || dev.role === 'superadmin');
}

module.exports = { isAdmin };
