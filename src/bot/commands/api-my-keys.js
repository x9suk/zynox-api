const { EmbedBuilder } = require('discord.js');
const Developer = require('../../models/Developer');
const ApiKey = require('../../models/ApiKey');

async function apiMyKeysCommand(interaction) {
  const developer = await Developer.findByDiscordId(interaction.user.id);
  if (!developer) {
    await interaction.reply({
      content: 'You do not have a developer account. Use `/api-create` to create one.',
      ephemeral: true,
    });
    return;
  }

  const activeKeys = await ApiKey.countDocuments({ developer: developer._id, isActive: true });
  const totalKeys = await ApiKey.countDocuments({ developer: developer._id });
  const limits = developer.getPlanLimits ? developer.getPlanLimits() : { maxKeys: 5 };

  const keys = await ApiKey.find({ developer: developer._id })
    .select('name keyPrefix plan scopes isActive dailyUsed dailyLimit lastUsedAt createdAt expiresAt')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const keyFields = [];
  if (keys.length === 0) {
    keyFields.push({ name: 'No Keys', value: 'Create one with `/api-create`.', inline: false });
  } else {
    for (const k of keys) {
      const status = k.isActive ? '✅ Active' : '❌ Revoked';
      const expires = k.expiresAt
        ? new Date(k.expiresAt) < new Date()
          ? 'Expired'
          : `<t:${Math.floor(new Date(k.expiresAt).getTime() / 1000)}:R>`
        : 'Never';
      const lastUsed = k.lastUsedAt
        ? `<t:${Math.floor(new Date(k.lastUsedAt).getTime() / 1000)}:R>`
        : 'Never';
      const scopes = (k.scopes || []).join(', ');
      const prefix = k.keyPrefix || k.keyPrefix || '—';

      keyFields.push({
        name: `${k.name} — ${k.plan}`,
        value: `Prefix: \`${prefix}...\` | ${status}\nScopes: ${scopes}\nUsed: ${k.dailyUsed || 0}/${k.dailyLimit || 100} today | Last: ${lastUsed} | Expires: ${expires}`,
        inline: false,
      });
    }
  }

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Your API Keys')
    .setDescription(`Developer: **${developer.username}** — Plan: **${developer.plan}**`)
    .addFields(
      { name: 'Active', value: `${activeKeys} / ${limits.maxKeys}`, inline: true },
      { name: 'Total (incl. revoked)', value: `${totalKeys}`, inline: true },
      ...keyFields,
    )
    .setFooter({ text: 'Raw API keys are never shown in chat.' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = apiMyKeysCommand;
