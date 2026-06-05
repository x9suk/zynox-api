const { isOwner, handleMaintenance } = require('../owner/ownerHandlers');

async function ownerMaintenanceCommand(interaction) {
  if (!isOwner(interaction.user.id)) {
    await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    return;
  }
  await handleMaintenance(interaction);
}

module.exports = ownerMaintenanceCommand;
