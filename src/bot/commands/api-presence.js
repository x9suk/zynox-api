const { EmbedBuilder } = require('discord.js');
const cacheService = require('../../services/cache.service');
const PresenceLog = require('../../models/PresenceLog');

async function apiPresenceCommand(interaction) {
  const discordId = interaction.options.getString('id');
  if (!/^\d{17,20}$/.test(discordId)) {
    await interaction.reply({ content: 'Invalid Discord ID.', ephemeral: true });
    return;
  }

  const cached = await cacheService.getUserPresence(discordId);
  const record = cached || (await PresenceLog.getHistory(discordId, 1))[0] || null;

  if (!record) {
    await interaction.reply({ content: 'No presence data found for this user.', ephemeral: true });
    return;
  }

  const status = record.status || 'offline';
  const statusEmoji = { online: '🟢', idle: '🟡', dnd: '🔴', offline: '⚫' };
  const statusLabel = { online: 'Online', idle: 'Idle', dnd: 'Do Not Disturb', offline: 'Offline' };

  const activityList = (record.activities || []).map(a => {
    const parts = [];
    if (a.emoji?.name) parts.push(a.emoji.name);
    if (a.name) parts.push(a.name);
    if (a.details) parts.push(`— ${a.details}`);
    return parts.join(' ') || 'Unknown activity';
  });

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle(`${statusEmoji[status] || '⚫'} ${statusLabel[status] || 'Offline'} — ${discordId}`)
    .addFields(
      { name: 'Status', value: statusLabel[status] || 'Offline', inline: true },
      { name: 'Source', value: cached ? 'Redis (live)' : 'MongoDB (logged)', inline: true },
    );

  if (record.clientStatus) {
    const devices = [];
    if (record.clientStatus.desktop) devices.push(`Desktop: ${record.clientStatus.desktop}`);
    if (record.clientStatus.mobile) devices.push(`Mobile: ${record.clientStatus.mobile}`);
    if (record.clientStatus.web) devices.push(`Web: ${record.clientStatus.web}`);
    if (devices.length) {
      embed.addFields({ name: 'Devices', value: devices.join('\n'), inline: true });
    }
  }

  if (activityList.length) {
    embed.addFields({ name: 'Activities', value: activityList.slice(0, 5).join('\n'), inline: false });
  }

  if (record.guildId) {
    embed.addFields({ name: 'Guild', value: record.guildId, inline: true });
  }

  const ts = record.lastUpdated || record.createdAt || record.timestamp;
  if (ts) {
    embed.addFields({ name: 'Last Updated', value: `<t:${Math.floor(new Date(ts).getTime() / 1000)}:R>`, inline: true });
  }

  await interaction.reply({ embeds: [embed] });
}

module.exports = apiPresenceCommand;
