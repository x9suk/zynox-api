const { EmbedBuilder } = require('discord.js');
const Developer = require('../../models/Developer');
const { getDeveloperAnalytics } = require('../../services/analytics.service');

async function analyticsCommand(interaction) {
  const developer = await Developer.findByDiscordId(interaction.user.id);
  if (!developer) {
    await interaction.reply({
      content: 'You need a Zynox developer account. Login at <https://api.zynoxbot.online/api/v1/auth/discord/login>.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const analytics = await getDeveloperAnalytics(developer._id);
  if (!analytics) {
    await interaction.editReply({ content: 'Could not load analytics data.' });
    return;
  }

  const percent = analytics.overallUsagePercent;
  const barLength = 20;
  const filled = Math.round((percent / 100) * barLength);
  const empty = barLength - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Your Analytics Summary')
    .setDescription(`Developer: **${developer.username}** — Plan: **${developer.plan}**`)
    .addFields(
      { name: 'Total Keys', value: `${analytics.totalKeys}`, inline: true },
      { name: 'Active Keys', value: `${analytics.activeKeys}`, inline: true },
      { name: 'Total (All Keys)', value: `${analytics.totalDailyUsed.toLocaleString()} / ${analytics.totalDailyLimit.toLocaleString()}`, inline: true },
      { name: 'Usage Today', value: `\`\`\`${bar}\`\`\`${percent}% of daily limit`, inline: false },
    );

  const keysList = analytics.keys.slice(0, 10).map(k =>
    `**${k.name}** (\`${k.prefix}...\`) — ${k.plan} ${k.isActive ? '✅' : '❌'}${k.expiresAt ? ` | Exp: <t:${Math.floor(new Date(k.expiresAt).getTime() / 1000)}:R>` : ''}`
  );

  if (keysList.length) {
    embed.addFields({ name: 'Keys Overview', value: keysList.join('\n').slice(0, 1024), inline: false });
  }

  embed.setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

module.exports = analyticsCommand;
