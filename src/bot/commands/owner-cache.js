const { isOwner, handleCache } = require('../owner/ownerHandlers');

async function ownerCacheCommand(interaction) {
  if (!isOwner(interaction.user.id)) {
    await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    return;
  }
  await handleCache(interaction);
}

module.exports = ownerCacheCommand;
