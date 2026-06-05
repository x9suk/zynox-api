const { isOwner, handlePlan } = require('../owner/ownerHandlers');

async function ownerPlanCommand(interaction) {
  if (!isOwner(interaction.user.id)) {
    await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    return;
  }
  await handlePlan(interaction);
}

module.exports = ownerPlanCommand;
