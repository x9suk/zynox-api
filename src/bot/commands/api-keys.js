const { EmbedBuilder } = require('discord.js');
const Developer = require('../../models/Developer');
const ApiKey = require('../../models/ApiKey');

async function apiKeysCommand(interaction) {
  const developer = await Developer.findByDiscordId(interaction.user.id);
  if (!developer) {
    await interaction.reply({
      content: 'You need a Zynox developer account. Login at <https://api.zynoxbot.online/api/v1/auth/discord/login>.',
      ephemeral: true,
    });
    return;
  }

  const limits = {
    free: { maxKeys: 5 },
    pro: { maxKeys: 25 },
    enterprise: { maxKeys: 100 },
  };
  const maxKeys = limits[developer.plan]?.maxKeys || 5;

  const activeKeys = await ApiKey.countDocuments({ developer: developer._id, isActive: true });
  const totalKeys = await ApiKey.countDocuments({ developer: developer._id });
  const expiredKeys = await ApiKey.countDocuments({
    developer: developer._id,
    isActive: true,
    expiresAt: { $ne: null, $lte: new Date() },
  });

  const keys = await ApiKey.find({ developer: developer._id, isActive: true })
    .select('name plan scopes dailyLimit lastUsedAt expiresAt createdAt')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const keyList = keys.map(k => {
    const expires = k.expiresAt
      ? new Date(k.expiresAt) < new Date()
        ? '⚠️ Expired'
        : `<t:${Math.floor(new Date(k.expiresAt).getTime() / 1000)}:R>`
      : 'Never';
    const lastUsed = k.lastUsedAt
      ? `<t:${Math.floor(new Date(k.lastUsedAt).getTime() / 1000)}:R>`
      : 'Never';
    const scopes = (k.scopes || []).join(', ');
    return `**${k.name}** — ${k.plan}\n└ Scopes: ${scopes} | Last: ${lastUsed} | Expires: ${expires}`;
  });

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Your API Keys')
    .setDescription(`Developer: **${developer.username}** — Plan: **${developer.plan}**`)
    .addFields(
      { name: 'Active', value: `${activeKeys} / ${maxKeys}`, inline: true },
      { name: 'Total (incl. revoked)', value: `${totalKeys}`, inline: true },
      { name: 'Expired', value: `${expiredKeys}`, inline: true },
    );

  if (keyList.length) {
    embed.addFields({ name: 'Recent Keys', value: keyList.join('\n\n').slice(0, 1024), inline: false });
  } else {
    embed.addFields({ name: 'Recent Keys', value: 'No active keys. Create one at the dashboard.', inline: false });
  }

  embed.setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

module.exports = apiKeysCommand;
