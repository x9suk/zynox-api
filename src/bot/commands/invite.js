const { EmbedBuilder } = require('discord.js');
const config = require('../../config/env');

async function inviteCommand(interaction) {
  const inviteUrl = config.discord.inviteUrl || `https://discord.com/oauth2/authorize?client_id=${config.discord.clientId}&scope=bot+applications.commands&permissions=0`;

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle('Invite the Bot')
        .setDescription(`[Click here to invite me](${inviteUrl})`)
        .setTimestamp(),
    ],
  });
}

module.exports = inviteCommand;
