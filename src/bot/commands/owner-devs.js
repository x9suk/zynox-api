const { isOwner, handleDevs } = require('../owner/ownerHandlers');

async function ownerDevsCommand(interaction) {
  if (!isOwner(interaction.user.id)) {
    await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    return;
  }
  await handleDevs(interaction);
}

module.exports = ownerDevsCommand;
