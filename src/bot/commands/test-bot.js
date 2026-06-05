const { EmbedBuilder } = require('discord.js');
const cacheService = require('../../services/cache.service');

async function testBotCommand(interaction) {
  const client = interaction.client;
  const cached = await cacheService.getBotStats(client.user.id);

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle(`Test — Bot Self-Check: ${client.user.tag}`)
    .setThumbnail(client.user.displayAvatarURL({ size: 128 }))
    .addFields(
      { name: 'ID', value: client.user.id, inline: true },
      { name: 'Guilds', value: `${client.guilds.cache.size}`, inline: true },
      { name: 'Users Cached', value: `${client.users.cache.size}`, inline: true },
      { name: 'WS Ping', value: `${client.ws.ping}ms`, inline: true },
      { name: 'Ready', value: client.isReady() ? '✅ Yes' : '❌ No', inline: true },
      { name: 'Uptime', value: client.uptime ? `${Math.floor(client.uptime / 1000)}s` : 'N/A', inline: true },
    );

  if (cached) {
    const embed2 = new EmbedBuilder()
      .setColor(0xF1C40F)
      .setTitle('Redis Cache Data')
      .addFields(
        { name: 'Guild Count', value: `${cached.guildCount || 0}`, inline: true },
        { name: 'User Count', value: `${cached.userCount || 0}`, inline: true },
        { name: 'Ping', value: `${cached.ping || 0}ms`, inline: true },
        { name: 'Memory (RSS)', value: cached.memoryUsage?.rss ? `${(cached.memoryUsage.rss / 1024 / 1024).toFixed(1)} MB` : 'N/A', inline: true },
        { name: 'Version', value: cached.version || 'N/A', inline: true },
      );

    await interaction.reply({ embeds: [embed, embed2] });
  } else {
    embed.addFields({ name: 'Redis Cache', value: 'No cached bot stats', inline: false });
    await interaction.reply({ embeds: [embed] });
  }
}

module.exports = testBotCommand;
