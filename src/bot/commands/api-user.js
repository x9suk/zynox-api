const { EmbedBuilder } = require('discord.js');
const User = require('../../models/User');

async function apiUserCommand(interaction) {
  const discordId = interaction.options.getString('id');
  if (!/^\d{17,20}$/.test(discordId)) {
    await interaction.reply({ content: 'Invalid Discord ID. Must be a 17-20 digit snowflake.', ephemeral: true });
    return;
  }

  const user = await User.findByDiscordId(discordId);
  if (!user) {
    await interaction.reply({ content: 'User not found in tracked data.', ephemeral: true });
    return;
  }

  const avatarExt = user.avatar?.startsWith('a_') ? 'gif' : 'png';
  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${discordId}/${user.avatar}.${avatarExt}`
    : null;
  const bannerUrl = user.banner
    ? `https://cdn.discordapp.com/banners/${discordId}/${user.banner}.png`
    : null;

  const embed = new EmbedBuilder()
    .setColor(user.accentColor || 0xF1C40F)
    .setTitle(`${user.username}${user.globalName ? ` (${user.globalName})` : ''}`)
    .setDescription(user.bot ? '🤖 Bot account' : '👤 User account')
    .addFields(
      { name: 'ID', value: discordId, inline: true },
      { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true },
      { name: 'Created', value: user.createdAt ? `<t:${Math.floor(new Date(user.createdAt).getTime() / 1000)}:R>` : 'Unknown', inline: true },
      { name: 'Last Seen', value: user.lastSeen ? `<t:${Math.floor(new Date(user.lastSeen).getTime() / 1000)}:R>` : 'Unknown', inline: true },
    )
    .setTimestamp();

  if (avatarUrl) embed.setThumbnail(avatarUrl);
  if (bannerUrl) embed.setImage(bannerUrl);

  await interaction.reply({ embeds: [embed] });
}

module.exports = apiUserCommand;
