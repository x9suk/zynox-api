const { EmbedBuilder } = require('discord.js');
const PresenceLog = require('../../models/PresenceLog');

async function apiTimelineCommand(interaction) {
  const discordId = interaction.options.getString('id');
  if (!/^\d{17,20}$/.test(discordId)) {
    await interaction.reply({ content: 'Invalid Discord ID.', ephemeral: true });
    return;
  }

  const limit = Math.min(Math.max(interaction.options.getInteger('limit') || 5, 1), 25);

  const records = await PresenceLog.getHistory(discordId, limit);
  if (!records || records.length === 0) {
    await interaction.reply({ content: 'No presence history found for this user.', ephemeral: true });
    return;
  }

  const statusEmoji = { online: '🟢', idle: '🟡', dnd: '🔴', offline: '⚫' };

  const lines = records.map((r, i) => {
    const ts = r.createdAt ? `<t:${Math.floor(new Date(r.createdAt).getTime() / 1000)}:R>` : 'unknown';
    const emoji = statusEmoji[r.status] || '⚫';
    const activities = (r.activities || []).map(a => a.name).filter(Boolean).join(', ') || '—';
    return `**${i + 1}.** ${emoji} ${r.status} — ${ts}\n└ ${activities.slice(0, 80)}`;
  });

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle(`Presence Timeline — ${discordId}`)
    .setDescription(lines.join('\n\n'))
    .setFooter({ text: `Last ${records.length} of ${limit} requested records` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

module.exports = apiTimelineCommand;
