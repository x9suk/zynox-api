const { EmbedBuilder } = require('discord.js');
const Developer = require('../../models/Developer');
const ApiKey = require('../../models/ApiKey');
const { isAdmin } = require('../../utils/adminCheck');

async function adminBanCommand(interaction) {
  if (!await isAdmin(interaction.user.id)) {
    await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    return;
  }

  const targetId = interaction.options.getString('user');
  if (!/^\d{17,20}$/.test(targetId)) {
    await interaction.reply({ content: 'Invalid Discord ID.', ephemeral: true });
    return;
  }

  const target = await Developer.findOne({ discordId: targetId });
  if (!target) {
    await interaction.reply({ content: 'Developer not found.', ephemeral: true });
    return;
  }

  if (target.isBanned) {
    await interaction.reply({ content: `${target.username} is already banned.`, ephemeral: true });
    return;
  }

  target.isBanned = true;
  target.banReason = interaction.options.getString('reason') || 'Banned by admin';
  await target.save();

  await ApiKey.updateMany(
    { developer: target._id, isActive: true },
    { isActive: false },
  );

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Developer Banned')
    .setDescription(`**${target.username}** (\`${targetId}\`) has been banned.`)
    .addFields(
      { name: 'Reason', value: target.banReason, inline: true },
      { name: 'Keys Revoked', value: 'All active keys deactivated', inline: true },
    )
    .setFooter({ text: `Banned by ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = adminBanCommand;
