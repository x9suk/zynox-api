const { EmbedBuilder } = require('discord.js');
const Developer = require('../../models/Developer');
const { isAdmin } = require('../../utils/adminCheck');

async function adminPlanCommand(interaction) {
  if (!await isAdmin(interaction.user.id)) {
    await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    return;
  }

  const targetId = interaction.options.getString('user');
  const newPlan = interaction.options.getString('plan');

  if (!/^\d{17,20}$/.test(targetId)) {
    await interaction.reply({ content: 'Invalid Discord ID.', ephemeral: true });
    return;
  }

  const target = await Developer.findOne({ discordId: targetId });
  if (!target) {
    await interaction.reply({ content: 'Developer not found.', ephemeral: true });
    return;
  }

  const oldPlan = target.plan;
  target.plan = newPlan;
  await target.save();

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Plan Updated')
    .setDescription(`**${target.username}** (\`${targetId}\`) plan changed to **${newPlan}**`)
    .addFields(
      { name: 'Previous Plan', value: oldPlan, inline: true },
      { name: 'New Plan', value: newPlan, inline: true },
    )
    .setFooter({ text: `Changed by ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = adminPlanCommand;
