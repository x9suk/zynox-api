const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

const CATEGORIES = [
  {
    name: '👤 Account',
    cmds: [
      '`/api-create` — Create developer account & API key',
      '`/api-my-status` — View your account status',
    ],
  },
  {
    name: '🔑 Keys',
    cmds: [
      '`/api-my-keys` — List your API keys (metadata only)',
      '`/api-regenerate` — Regenerate an API key (DM gets new key)',
      '`/api-revoke` — Revoke an API key',
    ],
  },
  {
    name: '📊 Usage',
    cmds: [
      '`/api-usage` — Today\'s usage, limits, rate limit',
    ],
  },
  {
    name: '🔔 Webhooks',
    cmds: [
      '`/api-webhook` — Configure webhooks for your keys',
    ],
  },
  {
    name: '📚 Info & Links',
    cmds: [
      '`/api-dashboard` — DM dashboard, docs & invite links',
      '`/api-docs` — API docs & quick-start',
      '`/api-help` — This command list',
    ],
  },
  {
    name: '🔍 Lookup',
    cmds: [
      '`/api-user <id>` — Discord user profile',
      '`/api-presence <id>` — User presence status',
      '`/api-bot <id>` — Tracked bot stats',
      '`/api-guild` — Current guild tracking stats',
      '`/api-timeline <id> [limit]` — Presence history',
    ],
  },
  {
    name: '📊 Stats & Status',
    cmds: [
      '`/api-stats` — Bot stats summary',
      '`/api-status` — API server, DB, Redis health',
      '`/status` — Comprehensive system health',
      '`/analytics` — Your API usage analytics',
      '`/stats` — Basic bot stats',
      '`/ping` — Bot + API latency',
    ],
  },
  {
    name: '🛠️ Test',
    cmds: [
      '`/test-user [target]` — Test user data lookup',
      '`/test-guild` — Test guild data',
      '`/test-bot` — Test bot self-check',
    ],
  },
  {
    name: '⚙️ Admin',
    cmds: [
      '`/admin-stats` — Platform statistics',
      '`/admin-plan <user> <plan>` — Change plan',
      '`/admin-ban <user> [reason]` — Ban developer',
      '`/admin-unban <user>` — Unban developer',
    ],
  },
  {
    name: '🛡️ Owner (prefix only)',
    cmds: [
      '`;stats` — Platform statistics',
      '`;health` — System health',
      '`;devs [page]` — List developers',
      '`;ban <user> [reason]` — Ban developer',
      '`;unban <user>` — Unban developer',
      '`;plan <user> <plan>` — Change plan',
      '`;cache [stats|flush] [group]` — Redis cache',
      '`;maintenance <on|off>` — Toggle maintenance',
      '`;logs` — Recent audit logs',
      '`;reload` — Reload command registry',
    ],
  },
];

async function apiHelpCommand(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Zynox Tracking API — Bot Commands')
    .setDescription(
      'Use **`/`** (slash) or **`!`** (prefix) for general commands.\n'
      + 'Use **`;`** for owner-only commands.\n'
      + '`<required>` `[optional]`\n\n'
      + '**Select a category below** to view commands.'
    )
    .setFooter({ text: `${CATEGORIES.reduce((s, c) => s + c.cmds.length, 0)} total commands` })
    .setTimestamp();

  const options = CATEGORIES.map((cat, i) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(cat.name.replace(/[^\w\s]/g, '').trim())
      .setValue(String(i))
      .setDescription(`${cat.cmds.length} commands`)
  );

  const select = new StringSelectMenuBuilder()
    .setCustomId('api-help-category')
    .setPlaceholder('Choose a category…')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(select);

  const reply = await interaction.reply({
    embeds: [embed],
    components: [row],
    fetchReply: true,
  });

  const collector = reply.createMessageComponentCollector({
    filter: (i) => i.customId === 'api-help-category' && i.user.id === interaction.user.id,
    time: 120_000,
  });

  collector.on('collect', async (i) => {
    const cat = CATEGORIES[parseInt(i.values[0])];
    const catEmbed = new EmbedBuilder()
      .setColor(0xF1C40F)
      .setTitle(cat.name)
      .setDescription(cat.cmds.join('\n'))
      .setFooter({ text: `${cat.cmds.length} commands in this category` })
      .setTimestamp();
    await i.update({ embeds: [catEmbed] });
  });

  collector.on('end', async () => {
    select.setDisabled(true);
    const disabledRow = new ActionRowBuilder().addComponents(select);
    await interaction.editReply({ components: [disabledRow] }).catch(() => {});
  });
}

module.exports = apiHelpCommand;
