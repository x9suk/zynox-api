const { EmbedBuilder } = require('discord.js');

async function pingCommand(interaction) {
  const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
  const latency = sent.createdTimestamp - interaction.createdTimestamp;
  const apiPing = interaction.client.ws.ping;

  await interaction.editReply({
    content: null,
    embeds: [
      new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle('Pong!')
        .addFields(
          { name: 'Bot Latency', value: `${latency}ms`, inline: true },
          { name: 'API Ping', value: `${apiPing}ms`, inline: true },
        )
        .setTimestamp(),
    ],
  });
}

module.exports = pingCommand;
