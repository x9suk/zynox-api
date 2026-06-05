const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config/env');

async function apiInviteCommand(interaction) {
  const inviteUrl = config.discord.inviteUrl
    || `https://discord.com/oauth2/authorize?client_id=${config.discord.clientId}&scope=bot+applications.commands&permissions=0`;

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Invite Zynox Bot')
    .setDescription(
      'Invite the bot to your server with both required scopes:\n\n'
      + '• `bot` — Join your server\n'
      + '• `applications.commands` — Enable slash commands'
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Invite Bot')
      .setStyle(ButtonStyle.Link)
      .setURL(inviteUrl),
    new ButtonBuilder()
      .setLabel('Developer Dashboard')
      .setStyle(ButtonStyle.Link)
      .setURL('https://api.zynoxbot.online/api/v1/auth/discord/login'),
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}

module.exports = apiInviteCommand;
