const { isOwner, handleHealth } = require('../owner/ownerHandlers');

async function ownerHealthCommand(interaction) {
  if (!isOwner(interaction.user.id)) {
    await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    return;
  }
  await handleHealth(interaction);
}

module.exports = ownerHealthCommand;
