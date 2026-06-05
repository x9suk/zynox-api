const mongoose = require('mongoose');
const { EmbedBuilder } = require('discord.js');
const { getRedis } = require('../../config/redis');
const config = require('../../config/env');
const Developer = require('../../models/Developer');
const ApiKey = require('../../models/ApiKey');
const OwnerAuditLog = require('../../models/OwnerAuditLog');
const { getHealth } = require('../../services/botHealth.service');

const p = config.redis.prefix;

async function audit(ownerDiscordId, command, opts = {}) {
  try {
    await OwnerAuditLog.log({ ownerDiscordId, command, ...opts });
  } catch {}
}

function isOwner(discordId) {
  return config.bot.ownerIds.includes(discordId);
}

async function handleStats(ctx) {
  const totalDevs = await Developer.countDocuments();
  const bannedDevs = await Developer.countDocuments({ isBanned: true });
  const totalKeys = await ApiKey.countDocuments();
  const activeKeys = await ApiKey.countDocuments({ isActive: true });
  const guildCount = ctx.client.guilds.cache.size;
  const userCount = ctx.client.users.cache.size;
  const uptime = Math.floor(process.uptime());
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Owner — Platform Stats')
    .addFields(
      { name: 'Developers', value: `${totalDevs} (${bannedDevs} banned)`, inline: true },
      { name: 'API Keys', value: `${totalKeys} total / ${activeKeys} active`, inline: true },
      { name: 'Guilds', value: `${guildCount}`, inline: true },
      { name: 'Users Cached', value: `${userCount}`, inline: true },
      { name: 'Bot Uptime', value: `${days}d ${hours}h`, inline: true },
    )
    .setTimestamp();

  await ctx.reply({ embeds: [embed] });
  await audit(ctx.user.id, 'stats');
}

async function handleHealth(ctx) {
  const mongoState = ['❌ Disconnected', '✅ Connected', '⏳ Connecting', '⏳ Disconnecting'];
  const mongoStatus = mongoose.connection.readyState;

  let redisOk = false;
  try {
    const redis = await getRedis();
    await redis.ping();
    redisOk = true;
  } catch {}

  const botHealth = getHealth();
  const uptime = Math.floor(process.uptime());
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const mem = process.memoryUsage();

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Owner — System Health')
    .addFields(
      { name: 'MongoDB', value: mongoState[mongoStatus] || 'Unknown', inline: true },
      { name: 'Redis', value: redisOk ? '✅ Connected' : '❌ Disconnected', inline: true },
      { name: 'Bot Status', value: botHealth.status === 'connected' ? '✅ Connected' : `⚠️ ${botHealth.status}`, inline: true },
      { name: 'Bot Uptime', value: `${days}d ${hours}h`, inline: true },
      { name: 'WS Ping', value: `${ctx.client.ws.ping}ms`, inline: true },
      { name: 'Reconnects', value: `${botHealth.reconnectAttempts}`, inline: true },
      { name: 'Unstable', value: botHealth.unstable ? '⚠️ Yes' : '✅ No', inline: true },
      { name: 'Memory (RSS)', value: `${(mem.rss / 1024 / 1024).toFixed(1)} MB`, inline: true },
      { name: 'Memory (Heap)', value: `${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`, inline: true },
    )
    .setTimestamp();

  await ctx.reply({ embeds: [embed] });
  await audit(ctx.user.id, 'health');
}

async function handleDevs(ctx) {
  const page = Math.max(1, ctx.options.getInteger('page') || 1);
  const limit = 10;
  const skip = (page - 1) * limit;

  const total = await Developer.countDocuments();
  const devs = await Developer.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('discordId username plan role isBanned')
    .lean();

  const lines = devs.map(d =>
    `**${d.username}** (\`${d.discordId}\`) — ${d.plan} | ${d.role}${d.isBanned ? ' ❌ Banned' : ''}`
  );

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle(`Owner — Developers (page ${page}/${Math.ceil(total / limit)})`)
    .setDescription(lines.join('\n') || 'No developers found.')
    .setFooter({ text: `${total} total` })
    .setTimestamp();

  await ctx.reply({ embeds: [embed] });
  await audit(ctx.user.id, 'devs', { args: { page } });
}

async function handleBan(ctx) {
  const targetId = ctx.options.getString('user');
  if (!/^\d{17,20}$/.test(targetId)) {
    await ctx.reply({ content: 'Invalid Discord ID.', ephemeral: true });
    return;
  }

  const target = await Developer.findOne({ discordId: targetId });
  if (!target) {
    await ctx.reply({ content: 'Developer not found.', ephemeral: true });
    return;
  }

  if (target.isBanned) {
    await ctx.reply({ content: `${target.username} is already banned.`, ephemeral: true });
    return;
  }

  const reason = ctx.options.getString('reason') || 'Banned by owner';
  const revokeKeys = ctx.options.getBoolean('revoke_keys') !== false;

  target.isBanned = true;
  target.banReason = reason;
  await target.save();

  if (revokeKeys) {
    await ApiKey.updateMany(
      { developer: target._id, isActive: true },
      { isActive: false },
    );
  }

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Owner — Developer Banned')
    .setDescription(`**${target.username}** (\`${targetId}\`) banned.`)
    .addFields(
      { name: 'Reason', value: reason, inline: true },
      { name: 'Keys Revoked', value: revokeKeys ? 'Yes' : 'No', inline: true },
    )
    .setTimestamp();

  await ctx.reply({ embeds: [embed], ephemeral: true });
  await audit(ctx.user.id, 'ban', { targetDiscordId: targetId, action: 'ban', reason });
}

async function handleUnban(ctx) {
  const targetId = ctx.options.getString('user');
  if (!/^\d{17,20}$/.test(targetId)) {
    await ctx.reply({ content: 'Invalid Discord ID.', ephemeral: true });
    return;
  }

  const target = await Developer.findOne({ discordId: targetId });
  if (!target) {
    await ctx.reply({ content: 'Developer not found.', ephemeral: true });
    return;
  }

  if (!target.isBanned) {
    await ctx.reply({ content: `${target.username} is not banned.`, ephemeral: true });
    return;
  }

  target.isBanned = false;
  target.banReason = null;
  await target.save();

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Owner — Developer Unbanned')
    .setDescription(`**${target.username}** (\`${targetId}\`) unbanned.`)
    .setTimestamp();

  await ctx.reply({ embeds: [embed], ephemeral: true });
  await audit(ctx.user.id, 'unban', { targetDiscordId: targetId, action: 'unban' });
}

async function handlePlan(ctx) {
  const targetId = ctx.options.getString('user');
  const newPlan = ctx.options.getString('plan');

  if (!/^\d{17,20}$/.test(targetId)) {
    await ctx.reply({ content: 'Invalid Discord ID.', ephemeral: true });
    return;
  }

  const validPlans = ['free', 'pro', 'enterprise'];
  if (!validPlans.includes(newPlan)) {
    await ctx.reply({ content: 'Invalid plan. Use free, pro, or enterprise.', ephemeral: true });
    return;
  }

  const target = await Developer.findOne({ discordId: targetId });
  if (!target) {
    await ctx.reply({ content: 'Developer not found.', ephemeral: true });
    return;
  }

  const oldPlan = target.plan;
  target.plan = newPlan;
  await target.save();

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Owner — Plan Changed')
    .setDescription(`**${target.username}** plan: ${oldPlan} → **${newPlan}**`)
    .setTimestamp();

  await ctx.reply({ embeds: [embed], ephemeral: true });
  await audit(ctx.user.id, 'plan', { targetDiscordId: targetId, action: `plan:${oldPlan}→${newPlan}` });
}

async function handleCache(ctx) {
  const sub = ctx.options.getString('action') || 'stats';
  const group = ctx.options.getString('group') || null;

  if (sub === 'flush') {
    if (!group) {
      await ctx.reply({ content: 'Specify a group to flush: presence, bot, guild, ratelimit, all.', ephemeral: true });
      return;
    }

    let count = 0;
    try {
      const redis = await getRedis();

      if (group === 'all') {
        const keys = await redis.keys(`${p}*`);
        if (keys.length) { await redis.del(keys); count = keys.length; }
      } else {
        const prefixMap = { presence: `${p}presence:`, bot: `${p}bot:`, guild: `${p}guild:`, ratelimit: `${p}ratelimit:` };
        const pattern = prefixMap[group];
        if (!pattern) {
          await ctx.reply({ content: `Unknown group: ${group}. Use presence, bot, guild, ratelimit, all.`, ephemeral: true });
          return;
        }
        const keys = await redis.keys(`${pattern}*`);
        if (keys.length) { await redis.del(keys); count = keys.length; }
      }
    } catch {}

    await ctx.reply({ content: `Flushed ${count} keys from group \`${group}\`.`, ephemeral: true });
    await audit(ctx.user.id, 'cache', { args: { action: 'flush', group }, reason: `flushed ${count} keys` });
    return;
  }

  let totalKeys = 0;
  try {
    const redis = await getRedis();
    const allKeys = await redis.keys(`${p}*`);
    totalKeys = allKeys.length;
  } catch {}

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Owner — Redis Cache Stats')
    .addFields(
      { name: 'Total Keys', value: `${totalKeys}`, inline: true },
      { name: 'Redis Prefix', value: `\`${p}\``, inline: true },
    )
    .setTimestamp();

  await ctx.reply({ embeds: [embed] });
  await audit(ctx.user.id, 'cache', { args: { action: 'stats' } });
}

async function handleMaintenance(ctx) {
  const sub = ctx.options.getString('action');
  if (!sub || !['on', 'off'].includes(sub)) {
    await ctx.reply({ content: 'Use `on` or `off`.', ephemeral: true });
    return;
  }

  try {
    const redis = await getRedis();
    const key = `${p}maintenance`;
    if (sub === 'on') {
      await redis.set(key, '1', { EX: 86400 });
    } else {
      await redis.del(key);
    }
  } catch {}

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Owner — Maintenance Mode')
    .setDescription(sub === 'on' ? '🔧 Maintenance mode **enabled**.' : '✅ Maintenance mode **disabled**.')
    .setTimestamp();

  await ctx.reply({ embeds: [embed], ephemeral: true });
  await audit(ctx.user.id, 'maintenance', { action: sub === 'on' ? 'maintenance:on' : 'maintenance:off' });
}

async function handleLogs(ctx) {
  try {
    const logs = await OwnerAuditLog.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    if (!logs.length) {
      await ctx.reply({ content: 'No audit logs yet.', ephemeral: true });
      return;
    }

    const lines = logs.map(l => {
      const ts = l.createdAt ? `<t:${Math.floor(new Date(l.createdAt).getTime() / 1000)}:R>` : '';
      const target = l.targetDiscordId ? ` → \`${l.targetDiscordId}\`` : '';
      return `\`${l.command}\`${target} ${l.success ? '✅' : '❌'} ${ts}`;
    });

    const embed = new EmbedBuilder()
      .setColor(0xF1C40F)
      .setTitle('Owner — Recent Audit Logs')
      .setDescription(lines.join('\n'))
      .setTimestamp();

    await ctx.reply({ embeds: [embed], ephemeral: true });
  } catch {
    await ctx.reply({ content: 'Could not fetch logs.', ephemeral: true });
  }
  await audit(ctx.user.id, 'logs');
}

async function handleReload(ctx) {
  await ctx.reply({ content: 'Command registry reload is not available in this environment. Restart the bot to pick up new commands.', ephemeral: true });
  await audit(ctx.user.id, 'reload');
}

module.exports = {
  isOwner,
  handleStats, handleHealth, handleDevs,
  handleBan, handleUnban, handlePlan,
  handleCache, handleMaintenance, handleLogs, handleReload,
};
