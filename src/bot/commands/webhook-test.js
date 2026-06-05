const { EmbedBuilder } = require('discord.js');
const Developer = require('../../models/Developer');
const ApiKey = require('../../models/ApiKey');
const { deliver } = require('../../services/webhook.service');

async function webhookTestCommand(interaction) {
  const developer = await Developer.findByDiscordId(interaction.user.id);
  if (!developer) {
    await interaction.reply({
      content: 'You need a Zynox developer account. Login at <https://api.zynoxbot.online/api/v1/auth/discord/login>.',
      ephemeral: true,
    });
    return;
  }

  const keys = await ApiKey.find({ developer: developer._id, isActive: true, webhookUrl: { $ne: null } })
    .select('name webhookUrl webhookSecret')
    .lean();

  if (keys.length === 0) {
    await interaction.reply({
      content: 'No API keys with webhook configured. Set a `webhookUrl` on a key at the developer dashboard.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const testPayload = {
    event: 'test',
    data: {
      message: 'This is a test webhook from Zynox Tracking API',
      userId: interaction.user.id,
      username: interaction.user.username,
    },
  };

  const results = [];
  for (const key of keys) {
    const result = await deliver(key.webhookUrl, 'test', testPayload, key.webhookSecret || undefined);
    results.push({ name: key.name, url: key.webhookUrl, ...result });
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Webhook Test Results')
    .setDescription(`Tested ${keys.length} key(s) with webhook configured.`)
    .addFields(
      { name: 'Succeeded', value: `${successCount}`, inline: true },
      { name: 'Failed', value: `${failCount}`, inline: true },
    );

  const detailLines = results.map(r =>
    `**${r.name}**: ${r.success ? '✅ Delivered' : '❌ ' + (r.error || 'Failed')} (${r.status || 'N/A'})`
  );
  embed.addFields({ name: 'Details', value: detailLines.join('\n'), inline: false });

  await interaction.editReply({ embeds: [embed] });
}

module.exports = webhookTestCommand;
