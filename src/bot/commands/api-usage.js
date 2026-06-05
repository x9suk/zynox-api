const { EmbedBuilder } = require('discord.js');
const Developer = require('../../models/Developer');
const ApiKey = require('../../models/ApiKey');

async function apiUsageCommand(interaction) {
  const developer = await Developer.findByDiscordId(interaction.user.id);
  if (!developer) {
    await interaction.reply({
      content: 'You need a Zynox developer account. Login at <https://api.zynoxbot.online/api/v1/auth/discord/login>.',
      ephemeral: true,
    });
    return;
  }

  const limits = {
    free: { dailyLimit: 100, maxKeys: 5 },
    pro: { dailyLimit: 10000, maxKeys: 25 },
    enterprise: { dailyLimit: 100000, maxKeys: 100 },
  };
  const plan = limits[developer.plan] || limits.free;
  const today = new Date().toISOString().slice(0, 10);
  const usedToday = developer.dailyUsage?.date === today ? developer.dailyUsage.count : 0;
  const remaining = Math.max(0, plan.dailyLimit - usedToday);

  const keyCount = await ApiKey.countDocuments({ developer: developer._id, isActive: true });

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Your API Usage')
    .setDescription(`Developer: **${developer.username}** — Plan: **${developer.plan}**`)
    .addFields(
      { name: 'Daily Limit', value: `${plan.dailyLimit.toLocaleString()} req/day`, inline: true },
      { name: 'Used Today', value: `${usedToday.toLocaleString()}`, inline: true },
      { name: 'Remaining', value: `${remaining.toLocaleString()}`, inline: true },
      { name: 'Active Keys', value: `${keyCount} / ${plan.maxKeys}`, inline: true },
      { name: 'Role', value: developer.role || 'developer', inline: true },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

module.exports = apiUsageCommand;
