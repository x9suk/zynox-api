const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

async function apiDocsCommand(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Zynox Tracking API — Documentation')
    .setDescription(
      'Track users, bots, guilds, and presence in real time via the Discord Gateway.\n\n'
      + '**Base URL:** `https://api.zynoxbot.online/api/v1`\n\n'
      + '### Quick Start\n'
      + '```\n'
      + 'curl -H "x-api-key: zynox_..." \\\n'
      + '  https://api.zynoxbot.online/api/v1/public/users/<USER_ID>\n'
      + '```\n\n'
      + '### Example Endpoints\n'
      + '• `GET /public/users/:id` — User profile\n'
      + '• `GET /public/users/:id/presence` — Presence status\n'
      + '• `GET /public/bots/:id/stats` — Bot statistics\n'
      + '• `GET /public/guilds/:id/stats` — Guild statistics\n'
      + '• `POST /public/users/batch` — Batch user lookup\n\n'
      + '### Authentication\n'
      + 'Pass your API key via the `x-api-key` header.\n'
      + 'Create keys at the developer dashboard.'
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('API Documentation')
      .setStyle(ButtonStyle.Link)
      .setURL('https://api.zynoxbot.online/api/v1/docs'),
    new ButtonBuilder()
      .setLabel('Developer Dashboard')
      .setStyle(ButtonStyle.Link)
      .setURL('https://api.zynoxbot.online/api/v1/auth/discord/login'),
    new ButtonBuilder()
      .setLabel('GitHub')
      .setStyle(ButtonStyle.Link)
      .setURL('https://github.com/anomalyco/LofiLink'),
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}

module.exports = apiDocsCommand;
