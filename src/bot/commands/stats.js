const { EmbedBuilder } = require('discord.js');

async function statsCommand(interaction) {
  const client = interaction.client;
  const guilds = client.guilds.cache.size;
  const users = client.users.cache.size;
  const uptime = Math.floor(process.uptime());
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const mem = process.memoryUsage();

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle('Bot Statistics')
        .addFields(
          { name: 'Guilds', value: `${guilds}`, inline: true },
          { name: 'Users', value: `${users}`, inline: true },
          { name: 'Uptime', value: `${days}d ${hours}h ${minutes}m`, inline: true },
          { name: 'Memory (RSS)', value: `${(mem.rss / 1024 / 1024).toFixed(1)} MB`, inline: true },
          { name: 'Memory (Heap)', value: `${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`, inline: true },
        )
        .setTimestamp(),
    ],
  });
}

module.exports = statsCommand;
