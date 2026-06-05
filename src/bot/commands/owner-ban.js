const { isOwner, handleBan } = require('../owner/ownerHandlers');

async function ownerBanCommand(interaction) {
  if (!isOwner(interaction.user.id)) {
    await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    return;
  }
  await handleBan(interaction);
}

module.exports = ownerBanCommand;
