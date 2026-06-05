const { isOwner, handleUnban } = require('../owner/ownerHandlers');

async function ownerUnbanCommand(interaction) {
  if (!isOwner(interaction.user.id)) {
    await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    return;
  }
  await handleUnban(interaction);
}

module.exports = ownerUnbanCommand;
