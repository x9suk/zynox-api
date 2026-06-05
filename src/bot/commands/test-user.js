const { EmbedBuilder } = require('discord.js');
const cacheService = require('../../services/cache.service');
const User = require('../../models/User');

async function testUserCommand(interaction) {
  const target = interaction.options.getUser('target') || interaction.user;
  const discordId = target.id;

  const user = await User.findByDiscordId(discordId);
  const cached = await cacheService.getUserPresence(discordId);

  const avatarExt = target.avatar?.startsWith('a_') ? 'gif' : 'png';
  const avatarUrl = target.avatarURL({ size: 128 });

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle(`Test — User Lookup: ${target.username}`)
    .setThumbnail(avatarUrl)
    .addFields(
      { name: 'ID', value: discordId, inline: true },
      { name: 'Display Name', value: target.displayName, inline: true },
      { name: 'Bot', value: target.bot ? 'Yes' : 'No', inline: true },
      { name: 'Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true },
      { name: 'In Guild', value: interaction.guild?.members.cache.has(discordId) ? 'Yes' : 'No', inline: true },
      { name: 'Mention', value: `<@${discordId}>`, inline: true },
    );

  if (user) {
    embed.addFields(
      { name: 'DB: Username', value: user.username, inline: true },
      { name: 'DB: Global Name', value: user.globalName || 'N/A', inline: true },
      { name: 'DB: Last Seen', value: user.lastSeen ? `<t:${Math.floor(new Date(user.lastSeen).getTime() / 1000)}:R>` : 'N/A', inline: true },
    );
  } else {
    embed.addFields({ name: 'Database', value: 'Not tracked in MongoDB', inline: false });
  }

  if (cached) {
    embed.addFields(
      { name: 'Redis: Status', value: cached.status || 'unknown', inline: true },
      { name: 'Redis: Cached', value: 'Yes', inline: true },
    );
  } else {
    embed.addFields({ name: 'Redis Cache', value: 'No presence cached', inline: false });
  }

  await interaction.reply({ embeds: [embed] });
}

module.exports = testUserCommand;
