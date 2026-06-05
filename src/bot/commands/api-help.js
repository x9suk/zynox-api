const { EmbedBuilder } = require('discord.js');

async function apiHelpCommand(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Zynox Tracking API — Bot Commands')
    .setDescription(
      'All commands are prefixed with `/`.'
    )
    .addFields(
      { name: '/api-status', value: 'Show API server, MongoDB, Redis, and bot health status', inline: false },
      { name: '/api-stats', value: 'Show bot stats: guild count, users, memory, uptime', inline: false },
      { name: '/api-guild', value: 'Show tracking stats for this guild (members, presence, roles)', inline: false },
      { name: '/api-docs', value: 'Show API documentation links and quick-start examples', inline: false },
      { name: '/api-help', value: 'Show this command list', inline: false },
      { name: '/api-invite', value: 'Get the bot invite link', inline: false },
      { name: '/ping', value: 'Check bot and API latency', inline: false },
      { name: '/stats', value: 'Show basic bot statistics', inline: false },
      { name: '/invite', value: 'Get the original bot invite link', inline: false },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

module.exports = apiHelpCommand;
