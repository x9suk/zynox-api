const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Developer = require('../../models/Developer');
const ApiKey = require('../../models/ApiKey');
const developerService = require('../../services/developer.service');
const OwnerAuditLog = require('../../models/OwnerAuditLog');
const logger = require('../../utils/logger');

const cooldowns = new Map();

function getCooldown(userId) {
  const key = `api-revoke:${userId}`;
  const now = Date.now();
  if (cooldowns.has(key)) {
    const remaining = (cooldowns.get(key) + 10000 - now) / 1000;
    if (remaining > 0) return Math.ceil(remaining);
  }
  cooldowns.set(key, now);
  return 0;
}

async function apiRevokeCommand(interaction) {
  const cd = getCooldown(interaction.user.id);
  if (cd) {
    await interaction.reply({ content: `Please wait ${cd}s before using this command again.`, ephemeral: true });
    return;
  }

  const developer = await Developer.findByDiscordId(interaction.user.id);
  if (!developer) {
    await interaction.reply({ content: 'You need a developer account. Use `/api-create`.', ephemeral: true });
    return;
  }

  if (developer.isBanned) {
    await interaction.reply({ content: 'Your account is banned.', ephemeral: true });
    return;
  }

  const activeKeys = await ApiKey.find({ developer: developer._id, isActive: true })
    .select('name keyPrefix plan scopes')
    .lean();

  if (activeKeys.length === 0) {
    await interaction.reply({ content: 'You have no active API keys to revoke.', ephemeral: true });
    return;
  }

  if (activeKeys.length === 1) {
    await showConfirm(interaction, developer, activeKeys[0]);
    return;
  }

  const options = activeKeys.map((k, i) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(k.name)
      .setValue(String(i))
      .setDescription(`${k.plan} — ${k.keyPrefix || '…'}`)
  );

  const select = new StringSelectMenuBuilder()
    .setCustomId('revoke-select')
    .setPlaceholder('Select a key to revoke…')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(select);

  const reply = await interaction.reply({
    content: 'Select the API key to revoke:',
    components: [row],
    fetchReply: true,
    ephemeral: true,
  });

  const collector = reply.createMessageComponentCollector({
    filter: i => i.customId === 'revoke-select' && i.user.id === interaction.user.id,
    time: 60000,
    max: 1,
  });

  collector.on('collect', async (i) => {
    const key = activeKeys[parseInt(i.values[0])];
    await showConfirm(i, developer, key);
  });

  collector.on('end', async (collected) => {
    if (collected.size === 0) {
      await interaction.editReply({ content: 'Timed out.', components: [] }).catch(() => {});
    }
  });
}

async function showConfirm(sourceInteraction, developer, key) {
  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Revoke API Key')
    .setDescription(`This will permanently revoke **${key.name}**. Continue?`)
    .addFields(
      { name: 'Key Name', value: key.name, inline: true },
      { name: 'Plan', value: key.plan, inline: true },
      { name: 'Prefix', value: key.keyPrefix || '—', inline: true },
    )
    .setTimestamp();

  const confirmBtn = new ButtonBuilder()
    .setCustomId('revoke-confirm')
    .setLabel('Yes, Revoke')
    .setStyle(ButtonStyle.Danger);
  const cancelBtn = new ButtonBuilder()
    .setCustomId('revoke-cancel')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);

  const reply = await sourceInteraction[sourceInteraction.isChatInputCommand ? 'reply' : 'update']({
    embeds: [embed],
    components: [row],
    fetchReply: true,
    ephemeral: true,
  });

  const collector = reply.createMessageComponentCollector({
    filter: i => i.user.id === (sourceInteraction.user || sourceInteraction.member.user).id,
    time: 60000,
    max: 1,
  });

  collector.on('collect', async (i) => {
    if (i.customId === 'revoke-cancel') {
      await i.update({ embeds: [embed.setDescription('Cancelled.')], components: [] });
      return;
    }

    try {
      await developerService.revokeApiKey(developer._id, key._id);

      await OwnerAuditLog.log({
        ownerDiscordId: i.user.id,
        command: 'api-revoke',
        action: 'api_key:revoked',
        targetDiscordId: i.user.id,
        reason: `Revoked key "${key.name}"`,
      });

      const successEmbed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle('Key Revoked')
        .setDescription(`**${key.name}** has been revoked and can no longer be used.`)
        .setTimestamp();

      await i.update({ embeds: [successEmbed], components: [] });
    } catch (err) {
      logger.error({ err, discordId: i.user.id }, 'Failed to revoke key');
      await i.update({
        embeds: [new EmbedBuilder().setColor(0xFF0000).setTitle('Error').setDescription(err.message).setTimestamp()],
        components: [],
      });
    }
  });

  collector.on('end', async (collected) => {
    if (collected.size === 0) {
      await sourceInteraction.editReply({ content: 'Timed out.', components: [] }).catch(() => {});
    }
  });
}

module.exports = apiRevokeCommand;
