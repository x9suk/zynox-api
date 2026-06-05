const { isOwner, handleReload } = require('../owner/ownerHandlers');

async function ownerReloadCommand(interaction) {
  if (!isOwner(interaction.user.id)) {
    await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    return;
  }
  await handleReload(interaction);
}

module.exports = ownerReloadCommand;
