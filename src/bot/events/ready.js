const { BotStats, GuildStats } = require('../../models');
const cacheService = require('../../services/cache.service');
const realtimeService = require('../../services/realtime.service');
const logger = require('../../utils/logger');
const { deployCommands } = require('../commands/deploy');

let statsInterval = null;
let guildStatsInterval = null;

function clearIntervals() {
  if (statsInterval) { clearInterval(statsInterval); statsInterval = null; }
  if (guildStatsInterval) { clearInterval(guildStatsInterval); guildStatsInterval = null; }
}

async function readyHandler(client) {
  clearIntervals();

  const user = client.user;
  logger.info({
    tag: user.tag,
    id: user.id,
    guilds: client.guilds.cache.size,
    users: client.users.cache.size,
  }, 'Bot is ready');

  await cacheStats(client);
  await cacheAllGuildStats(client);

  await deployCommands();

  statsInterval = setInterval(async () => {
    await cacheStats(client);
  }, 30000);

  guildStatsInterval = setInterval(async () => {
    await cacheAllGuildStats(client);
  }, 60000);
}

async function cacheStats(client) {
  try {
    const guilds = client.guilds.cache;
    let totalMembers = 0;
    let totalChannels = 0;

    for (const guild of guilds.values()) {
      if (guild.memberCount) {
        totalMembers += guild.memberCount;
      }
      totalChannels += guild.channels.cache.size;
    }

    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();

    const stats = {
      uptime: process.uptime(),
      ping: client.ws.ping,
      guildCount: guilds.size,
      userCount: client.users.cache.size,
      memberCount: totalMembers,
      channelCount: totalChannels,
      commandCount: 0,
      voiceConnections: 0,
      shardId: client.shard?.ids?.[0] || 0,
      shardCount: client.shard?.count || 1,
      memoryUsage: {
        rss: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
        external: mem.external,
      },
      cpuUsage: {
        user: cpu.user,
        system: cpu.system,
      },
      version: process.env.npm_package_version || '1.0.0',
    };

    await cacheService.setBotStats(client.user.id, stats);

    await BotStats.recordStats(stats);

    realtimeService.emitBotStatsUpdate(client.user.id, stats);

    logger.debug({ guildCount: guilds.size, ping: client.ws.ping }, 'Bot stats cached');
  } catch (err) {
    logger.error({ err }, 'Failed to cache bot stats');
  }
}

async function cacheAllGuildStats(client) {
  const guilds = [...client.guilds.cache.values()];
  const concurrency = 10;
  const results = [];

  for (let i = 0; i < guilds.length; i += concurrency) {
    const batch = guilds.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(g => cacheSingleGuildStats(g, client).catch(err => {
        logger.warn({ guildId: g.id, err: err.message }, 'Failed to cache guild stats');
      })),
    );
    results.push(...batchResults);
  }

  const failed = results.filter(r => r.status === 'rejected').length;
  if (failed > 0) {
    logger.warn({ total: guilds.length, failed }, 'Some guild stats failed to cache');
  }
}

async function cacheSingleGuildStats(guild, _client) {
  try {
    await guild.members.fetch();
  } catch {
    // partial fetch may fail for large guilds
  }

  let online = 0;
  let idle = 0;
  let dnd = 0;
  let offline = 0;
  let bots = 0;
  let humans = 0;

  if (guild.members.cache.size > 0) {
    for (const member of guild.members.cache.values()) {
      if (member.user.bot) { bots++; }
      else { humans++; }
      const status = member.presence?.status;
      if (status === 'online') online++;
      else if (status === 'idle') idle++;
      else if (status === 'dnd') dnd++;
      else offline++;
    }
  }

  const voiceCount = guild.channels.cache
    .filter((c) => c.isVoiceBased?.())
    .reduce((sum, c) => sum + c.members.size, 0);

  const data = {
    guildName: guild.name,
    memberCount: guild.memberCount || 0,
    botCount: bots,
    humanCount: humans,
    channelCount: guild.channels.cache.size,
    roleCount: guild.roles.cache.size,
    voiceConnections: voiceCount,
    onlineCount: online,
    idleCount: idle,
    dndCount: dnd,
    offlineCount: offline,
  };

  await cacheService.setGuildStats(guild.id, data);

  await GuildStats.recordStats(guild.id, data);

  realtimeService.emitGuildStatsUpdate(guild.id, data);
}

module.exports = { readyHandler, cacheSingleGuildStats };
