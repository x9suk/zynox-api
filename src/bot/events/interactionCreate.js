const pingCommand = require('../commands/ping');
const statsCommand = require('../commands/stats');
const inviteCommand = require('../commands/invite');
const apiStatusCommand = require('../commands/api-status');
const apiStatsCommand = require('../commands/api-stats');
const apiGuildCommand = require('../commands/api-guild');
const apiDocsCommand = require('../commands/api-docs');
const apiHelpCommand = require('../commands/api-help');
const apiInviteCommand = require('../commands/api-invite');
const apiUserCommand = require('../commands/api-user');
const apiPresenceCommand = require('../commands/api-presence');
const apiBotCommand = require('../commands/api-bot');
const apiUsageCommand = require('../commands/api-usage');
const apiTimelineCommand = require('../commands/api-timeline');
const apiKeysCommand = require('../commands/api-keys');
const apiCreateCommand = require('../commands/api-create');
const apiDashboardCommand = require('../commands/api-dashboard');
const apiMyStatusCommand = require('../commands/api-my-status');
const apiMyKeysCommand = require('../commands/api-my-keys');
const apiRegenerateCommand = require('../commands/api-regenerate');
const apiRevokeCommand = require('../commands/api-revoke');
const apiWebhookCommand = require('../commands/api-webhook');
const webhookTestCommand = require('../commands/webhook-test');
const adminStatsCommand = require('../commands/admin-stats');
const adminPlanCommand = require('../commands/admin-plan');
const adminBanCommand = require('../commands/admin-ban');
const adminUnbanCommand = require('../commands/admin-unban');
const testUserCommand = require('../commands/test-user');
const testGuildCommand = require('../commands/test-guild');
const testBotCommand = require('../commands/test-bot');
const analyticsCommand = require('../commands/analytics');
const statusCommand = require('../commands/status');
const helpCommand = require('../commands/help');
const ownerStatsCommand = require('../commands/owner-stats');
const ownerHealthCommand = require('../commands/owner-health');
const ownerDevsCommand = require('../commands/owner-devs');
const ownerBanCommand = require('../commands/owner-ban');
const ownerUnbanCommand = require('../commands/owner-unban');
const ownerPlanCommand = require('../commands/owner-plan');
const ownerCacheCommand = require('../commands/owner-cache');
const ownerMaintenanceCommand = require('../commands/owner-maintenance');
const ownerLogsCommand = require('../commands/owner-logs');
const ownerReloadCommand = require('../commands/owner-reload');
const logger = require('../../utils/logger');

const commandMap = {
  ping: pingCommand,
  stats: statsCommand,
  invite: inviteCommand,
  'api-status': apiStatusCommand,
  'api-stats': apiStatsCommand,
  'api-guild': apiGuildCommand,
  'api-docs': apiDocsCommand,
  'api-help': apiHelpCommand,
  'api-invite': apiInviteCommand,
  'api-user': apiUserCommand,
  'api-presence': apiPresenceCommand,
  'api-bot': apiBotCommand,
  'api-usage': apiUsageCommand,
  'api-timeline': apiTimelineCommand,
  'api-keys': apiKeysCommand,
  'api-create': apiCreateCommand,
  'api-dashboard': apiDashboardCommand,
  'api-my-status': apiMyStatusCommand,
  'api-my-keys': apiMyKeysCommand,
  'api-regenerate': apiRegenerateCommand,
  'api-revoke': apiRevokeCommand,
  'api-webhook': apiWebhookCommand,
  'webhook-test': webhookTestCommand,
  'admin-stats': adminStatsCommand,
  'admin-plan': adminPlanCommand,
  'admin-ban': adminBanCommand,
  'admin-unban': adminUnbanCommand,
  'owner-stats': ownerStatsCommand,
  'owner-health': ownerHealthCommand,
  'owner-devs': ownerDevsCommand,
  'owner-ban': ownerBanCommand,
  'owner-unban': ownerUnbanCommand,
  'owner-plan': ownerPlanCommand,
  'owner-cache': ownerCacheCommand,
  'owner-maintenance': ownerMaintenanceCommand,
  'owner-logs': ownerLogsCommand,
  'owner-reload': ownerReloadCommand,
  'test-user': testUserCommand,
  'test-guild': testGuildCommand,
  'test-bot': testBotCommand,
  analytics: analyticsCommand,
  status: statusCommand,
  help: helpCommand,
};

async function interactionCreateHandler(interaction) {
  if (!interaction.isChatInputCommand()) return;

  const handler = commandMap[interaction.commandName];
  if (!handler) {
    logger.warn({ command: interaction.commandName }, 'Unknown command');
    return;
  }

  try {
    await handler(interaction);
  } catch (err) {
    logger.error({ err, command: interaction.commandName }, 'Command execution error');
    const content = 'An error occurred while executing the command.';
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ content }).catch(() => {});
    } else {
      await interaction.reply({ content, ephemeral: true }).catch(() => {});
    }
  }
}

module.exports = interactionCreateHandler;
module.exports.commandMap = commandMap;
