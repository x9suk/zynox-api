const { EmbedBuilder } = require('discord.js');

const CATEGORIES = [
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
    name: '🔑 Developer',
    cmds: [
      '`/api-usage` — Your daily API usage & limits',
      '`/api-keys` — Active key count & recent keys',
      '`/webhook-test` — Test webhook delivery',
    ],
  },
  {
    name: '📚 Info & Links',
    cmds: [
      '`/api-docs` — API docs, dashboard, GitHub',
      '`/api-invite` — Bot invite with scopes',
      '`/invite` — Original bot invite link',
      '`/api-help` — Legacy command list',
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

async function helpCommand(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Zynox Tracking API — Bot Commands')
    .setDescription(
      'Use **`/`** (slash) or **`!`** (prefix) for general commands.\n'
      + 'Use **`;`** for owner-only commands.\n'
      + '`<required>` `[optional]`'
    );

  for (const cat of CATEGORIES) {
    embed.addFields({ name: cat.name, value: cat.cmds.join('\n'), inline: false });
  }

  embed.setFooter({ text: `${CATEGORIES.reduce((s, c) => s + c.cmds.length, 0)} commands` });
  embed.setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

module.exports = helpCommand;
