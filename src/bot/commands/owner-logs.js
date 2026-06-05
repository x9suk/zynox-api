const { isOwner, handleLogs } = require('../owner/ownerHandlers');

async function ownerLogsCommand(interaction) {
  if (!isOwner(interaction.user.id)) {
    await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    return;
  }
  await handleLogs(interaction);
}

module.exports = ownerLogsCommand;
