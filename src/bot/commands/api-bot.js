const { EmbedBuilder } = require('discord.js');
const cacheService = require('../../services/cache.service');

async function apiBotCommand(interaction) {
  const botId = interaction.options.getString('id');
  if (!/^\d{17,20}$/.test(botId)) {
    await interaction.reply({ content: 'Invalid bot ID.', ephemeral: true });
    return;
  }

  const stats = await cacheService.getBotStats(botId);
  if (!stats) {
    await interaction.reply({ content: 'No stats found for this bot. The bot may not be tracked yet.', ephemeral: true });
    return;
  }

  const uptime = stats.uptime || 0;
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const uptimeStr = `${days}d ${hours}h ${minutes}m`;

  const mem = stats.memoryUsage || {};
  const memRss = mem.rss ? `${(mem.rss / 1024 / 1024).toFixed(1)} MB` : 'N/A';
  const memHeap = mem.heapUsed ? `${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB` : 'N/A';

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle(`Bot Stats — ${botId}`)
    .addFields(
      { name: 'Guilds', value: `${stats.guildCount || 0}`, inline: true },
      { name: 'Users', value: `${stats.userCount || 0}`, inline: true },
      { name: 'Members', value: `${stats.memberCount || 0}`, inline: true },
      { name: 'Channels', value: `${stats.channelCount || 0}`, inline: true },
      { name: 'Ping', value: `${stats.ping || 0}ms`, inline: true },
      { name: 'Uptime', value: uptimeStr, inline: true },
      { name: 'Memory (RSS)', value: memRss, inline: true },
      { name: 'Memory (Heap)', value: memHeap, inline: true },
      { name: 'Voice Connections', value: `${stats.voiceConnections || 0}`, inline: true },
      { name: 'Command Count', value: `${stats.commandCount || 0}`, inline: true },
    );

  if (stats.version) {
    embed.addFields({ name: 'Version', value: stats.version, inline: true });
  }

  await interaction.reply({ embeds: [embed] });
}

module.exports = apiBotCommand;
