const { EmbedBuilder } = require('discord.js');
const Developer = require('../../models/Developer');
const ApiKey = require('../../models/ApiKey');
const { isAdmin } = require('../../utils/adminCheck');

async function adminStatsCommand(interaction) {
  if (!await isAdmin(interaction.user.id)) {
    await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    return;
  }

  const totalDevelopers = await Developer.countDocuments();
  const bannedDevelopers = await Developer.countDocuments({ isBanned: true });
  const totalKeys = await ApiKey.countDocuments();
  const activeKeys = await ApiKey.countDocuments({ isActive: true });
  const proKeys = await ApiKey.countDocuments({ plan: 'pro', isActive: true });
  const enterpriseKeys = await ApiKey.countDocuments({ plan: 'enterprise', isActive: true });

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Admin — Platform Stats')
    .addFields(
      { name: 'Total Developers', value: `${totalDevelopers}`, inline: true },
      { name: 'Banned', value: `${bannedDevelopers}`, inline: true },
      { name: 'Active Developers', value: `${totalDevelopers - bannedDevelopers}`, inline: true },
      { name: 'Total API Keys', value: `${totalKeys}`, inline: true },
      { name: 'Active Keys', value: `${activeKeys}`, inline: true },
      { name: 'Pro Keys', value: `${proKeys}`, inline: true },
      { name: 'Enterprise Keys', value: `${enterpriseKeys}`, inline: true },
    )
    .setFooter({ text: `Requested by ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = adminStatsCommand;
