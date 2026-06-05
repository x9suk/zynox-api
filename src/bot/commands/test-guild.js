const { EmbedBuilder } = require('discord.js');
const cacheService = require('../../services/cache.service');

async function testGuildCommand(interaction) {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  await guild.members.fetch().catch(() => {});

  const cached = await cacheService.getGuildStats(guild.id);

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle(`Test — Guild Lookup: ${guild.name}`)
    .setThumbnail(guild.iconURL({ size: 128 }))
    .addFields(
      { name: 'ID', value: guild.id, inline: true },
      { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
      { name: 'Members (claimed)', value: `${guild.memberCount || 0}`, inline: true },
      { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true },
      { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
      { name: 'Boost Tier', value: `${guild.premiumTier || 0}`, inline: true },
      { name: 'Boosts', value: `${guild.premiumSubscriptionCount || 0}`, inline: true },
      { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
      { name: 'AFK Timeout', value: guild.afkTimeout ? `${guild.afkTimeout}s` : 'None', inline: true },
    );

  if (cached) {
    embed.addFields(
      { name: 'Redis: Members', value: `${cached.memberCount || 0}`, inline: true },
      { name: 'Redis: Online', value: `${cached.onlineCount || 0}`, inline: true },
      { name: 'Redis: Bots', value: `${cached.botCount || 0}`, inline: true },
    );
  }

  embed.setFooter({ text: `Verification: ${guild.verificationLevel || 0}` });

  await interaction.reply({ embeds: [embed] });
}

module.exports = testGuildCommand;
