const { EmbedBuilder } = require('discord.js');
const cacheService = require('../../services/cache.service');

async function apiStatsCommand(interaction) {
  const client = interaction.client;
  const guilds = client.guilds.cache.size;
  const users = client.users.cache.size;
  const uptime = Math.floor(process.uptime());
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const mem = process.memoryUsage();

  const botStats = await cacheService.getBotStats(client.user.id);

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle('Zynox Tracking API — Stats')
        .addFields(
          { name: 'Guilds', value: `${guilds}`, inline: true },
          { name: 'Users Cached', value: `${users}`, inline: true },
          { name: 'Uptime', value: `${days}d ${hours}h ${minutes}m`, inline: true },
          { name: 'Memory (RSS)', value: `${(mem.rss / 1024 / 1024).toFixed(1)} MB`, inline: true },
          { name: 'Memory (Heap)', value: `${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`, inline: true },
          { name: 'WS Ping', value: `${client.ws.ping}ms`, inline: true },
          { name: 'Data Source', value: botStats ? 'Redis (cached)' : 'Live (memory)', inline: true },
          { name: 'Command Count', value: `${botStats?.commandCount || 0}`, inline: true },
          { name: 'Voice Connections', value: `${botStats?.voiceConnections || 0}`, inline: true },
        )
        .setTimestamp(),
    ],
  });
}

module.exports = apiStatsCommand;
