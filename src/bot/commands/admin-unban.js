const { EmbedBuilder } = require('discord.js');
const Developer = require('../../models/Developer');
const { isAdmin } = require('../../utils/adminCheck');

async function adminUnbanCommand(interaction) {
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

  if (!target.isBanned) {
    await interaction.reply({ content: `${target.username} is not banned.`, ephemeral: true });
    return;
  }

  target.isBanned = false;
  target.banReason = null;
  await target.save();

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Developer Unbanned')
    .setDescription(`**${target.username}** (\`${targetId}\`) has been unbanned.`)
    .setFooter({ text: `Unbanned by ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = adminUnbanCommand;
