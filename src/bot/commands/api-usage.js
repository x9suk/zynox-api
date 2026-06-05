const { EmbedBuilder } = require('discord.js');
const Developer = require('../../models/Developer');
const ApiKey = require('../../models/ApiKey');
const rateLimitService = require('../../services/rateLimit.service');

async function apiUsageCommand(interaction) {
  const developer = await Developer.findByDiscordId(interaction.user.id);
  if (!developer) {
    await interaction.reply({
      content: 'You need a Zynox developer account. Use `/api-create`.',
      ephemeral: true,
    });
    return;
  }

  const limits = {
    free: { dailyLimit: 100, ratePerMin: 10 },
    pro: { dailyLimit: 10000, ratePerMin: 60 },
    enterprise: { dailyLimit: 100000, ratePerMin: 300 },
  };
  const plan = limits[developer.plan] || limits.free;
  const today = new Date().toISOString().slice(0, 10);
  const usedToday = developer.dailyUsage?.date === today ? developer.dailyUsage.count : 0;
  const remaining = Math.max(0, plan.dailyLimit - usedToday);

  const activeKeys = await ApiKey.find({ developer: developer._id, isActive: true }).select('_id').lean();
  let totalRateUsed = 0;
  let totalRateLimit = 0;

  for (const key of activeKeys) {
    try {
      const usage = await rateLimitService.checkKey(key._id.toString(), plan.ratePerMin, 60000);
      totalRateUsed += usage.used;
      totalRateLimit = usage.limit;
    } catch {}
  }

  const keyCount = activeKeys.length;
  const maxKeys = developer.maxApiKeys || 5;

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Your API Usage')
    .setDescription(`Developer: **${developer.username}** — Plan: **${developer.plan}**`)
    .addFields(
      { name: 'Daily Limit', value: `${plan.dailyLimit.toLocaleString()} req/day`, inline: true },
      { name: 'Used Today', value: `${usedToday.toLocaleString()}`, inline: true },
      { name: 'Remaining', value: `${remaining.toLocaleString()}`, inline: true },
      { name: 'Rate Limit', value: `${plan.ratePerMin}/min`, inline: true },
      { name: 'Rate Used (last min)', value: `${totalRateUsed}`, inline: true },
      { name: 'Active Keys', value: `${keyCount} / ${maxKeys}`, inline: true },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = apiUsageCommand;
