const { EmbedBuilder } = require('discord.js');
const Developer = require('../../models/Developer');
const ApiKey = require('../../models/ApiKey');
const Subscription = require('../../models/Subscription');

async function apiMyStatusCommand(interaction) {
  const developer = await Developer.findByDiscordId(interaction.user.id);
  if (!developer) {
    await interaction.reply({
      content: 'You do not have a developer account. Use `/api-create` to create one.',
      ephemeral: true,
    });
    return;
  }

  const activeKeys = await ApiKey.countDocuments({ developer: developer._id, isActive: true });
  const today = new Date().toISOString().slice(0, 10);
  const usedToday = developer.dailyUsage?.date === today ? developer.dailyUsage.count : 0;
  const limits = developer.getPlanLimits ? developer.getPlanLimits() : { dailyLimit: 100, maxKeys: 5 };
  const sub = await Subscription.getActiveForDeveloper(developer._id);

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Developer Account Status')
    .setDescription(`**${developer.username}**${developer.globalName ? ` (${developer.globalName})` : ''}`)
    .addFields(
      { name: 'Plan', value: developer.plan, inline: true },
      { name: 'Role', value: developer.role || 'developer', inline: true },
      { name: 'Banned', value: developer.isBanned ? 'Yes' : 'No', inline: true },
      { name: 'Active Keys', value: `${activeKeys} / ${limits.maxKeys}`, inline: true },
      { name: 'Daily Used', value: `${usedToday} / ${limits.dailyLimit}`, inline: true },
      { name: 'Subscription', value: sub ? `${sub.plan} (${sub.status})` : 'None', inline: true },
    )
    .setFooter({ text: `Created: ${new Date(developer.createdAt).toLocaleDateString()}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = apiMyStatusCommand;
