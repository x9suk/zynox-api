const { EmbedBuilder } = require('discord.js');
const cacheService = require('../../services/cache.service');
const { getHealth } = require('../../services/botHealth.service');

async function apiGuildCommand(interaction) {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  await guild.members.fetch().catch(() => {});

  let online = 0;
  let idle = 0;
  let dnd = 0;
  let offline = 0;
  let bots = 0;
  let humans = 0;

  for (const member of guild.members.cache.values()) {
    if (member.user.bot) { bots++; }
    else { humans++; }
    const status = member.presence?.status;
    if (status === 'online') online++;
    else if (status === 'idle') idle++;
    else if (status === 'dnd') dnd++;
    else offline++;
  }

  const voiceCount = guild.channels.cache
    .filter((c) => c.isVoiceBased?.())
    .reduce((sum, c) => sum + c.members.size, 0);

  const cachedStats = await cacheService.getGuildStats(guild.id);
  const sourceLabel = cachedStats ? 'Redis (cached)' : 'Live (memory)';

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle(`Guild Stats — ${guild.name}`)
    .setThumbnail(guild.iconURL({ size: 128 }))
    .addFields(
      { name: 'Total Members', value: `${guild.memberCount || 0}`, inline: true },
      { name: 'Humans', value: `${humans}`, inline: true },
      { name: 'Bots', value: `${bots}`, inline: true },
      { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true },
      { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
      { name: 'Voice Users', value: `${voiceCount}`, inline: true },
      { name: '🟢 Online', value: `${online}`, inline: true },
      { name: '🟡 Idle', value: `${idle}`, inline: true },
      { name: '🔴 DND', value: `${dnd}`, inline: true },
      { name: '⚫ Offline', value: `${offline}`, inline: true },
      { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
      { name: 'Data Source', value: sourceLabel, inline: true },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

module.exports = apiGuildCommand;
