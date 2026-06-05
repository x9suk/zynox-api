const { isOwner, handleStats } = require('../owner/ownerHandlers');

async function ownerStatsCommand(interaction) {
  if (!isOwner(interaction.user.id)) {
    await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    return;
  }
  await handleStats(interaction);
}

module.exports = ownerStatsCommand;
