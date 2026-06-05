const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

async function apiDashboardCommand(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Zynox Tracking API — Dashboard')
    .setDescription(
      'Manage your API keys, view usage, and configure webhooks.\n\n'
      + '**Dashboard:** https://api.zynoxbot.online/api/v1/auth/discord/login\n'
      + '**API Docs:** https://api.zynoxbot.online/api/v1/docs\n'
      + '**Base URL:** `https://api.zynoxbot.online/api/v1`'
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Open Dashboard')
      .setStyle(ButtonStyle.Link)
      .setURL('https://api.zynoxbot.online/api/v1/auth/discord/login'),
    new ButtonBuilder()
      .setLabel('API Docs')
      .setStyle(ButtonStyle.Link)
      .setURL('https://api.zynoxbot.online/api/v1/docs'),
    new ButtonBuilder()
      .setLabel('Invite Bot')
      .setStyle(ButtonStyle.Link)
      .setURL('https://discord.com/oauth2/authorize?client_id=1358822221343162491&permissions=8&integration_type=0&scope=bot'),
  );

  try {
    await interaction.user.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: 'Check your DM for the dashboard links.', ephemeral: true });
  } catch {
    await interaction.reply({
      content: 'Could not send you a DM. Please enable DMs from server members and try again.\n\n'
        + '**Dashboard:** https://api.zynoxbot.online/api/v1/auth/discord/login\n'
        + '**API Docs:** https://api.zynoxbot.online/api/v1/docs',
      ephemeral: true,
    });
  }
}

module.exports = apiDashboardCommand;
