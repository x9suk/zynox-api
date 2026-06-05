const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Developer = require('../../models/Developer');
const ApiKey = require('../../models/ApiKey');
const developerService = require('../../services/developer.service');
const OwnerAuditLog = require('../../models/OwnerAuditLog');
const logger = require('../../utils/logger');

const cooldowns = new Map();

function getCooldown(userId) {
  const key = `api-regenerate:${userId}`;
  const now = Date.now();
  if (cooldowns.has(key)) {
    const remaining = (cooldowns.get(key) + 30000 - now) / 1000;
    if (remaining > 0) return Math.ceil(remaining);
  }
  cooldowns.set(key, now);
  return 0;
}

async function apiRegenerateCommand(interaction) {
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
    await interaction.reply({ content: 'You have no active API keys to regenerate.', ephemeral: true });
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
      .setDescription(`${k.plan} — ${k.keyPrefix || '…'}${k.scopes ? ` (${k.scopes.join(', ')})` : ''}`)
  );

  const select = new StringSelectMenuBuilder()
    .setCustomId('regenerate-select')
    .setPlaceholder('Select a key to regenerate…')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(select);

  const reply = await interaction.reply({
    content: 'Select the API key to regenerate:',
    components: [row],
    fetchReply: true,
    ephemeral: true,
  });

  const collector = reply.createMessageComponentCollector({
    filter: i => i.customId === 'regenerate-select' && i.user.id === interaction.user.id,
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
    .setTitle('Regenerate API Key')
    .setDescription(`This will revoke **${key.name}** and create a new one. Continue?`)
    .addFields(
      { name: 'Key Name', value: key.name, inline: true },
      { name: 'Plan', value: key.plan, inline: true },
      { name: 'Scopes', value: (key.scopes || []).join(', ') || '—', inline: false },
    )
    .setTimestamp();

  const confirmBtn = new ButtonBuilder()
    .setCustomId('regenerate-confirm')
    .setLabel('Yes, Regenerate')
    .setStyle(ButtonStyle.Danger);
  const cancelBtn = new ButtonBuilder()
    .setCustomId('regenerate-cancel')
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
    if (i.customId === 'regenerate-cancel') {
      await i.update({ embeds: [embed.setDescription('Cancelled.')], components: [] });
      return;
    }

    try {
      const result = await developerService.regenerateApiKey(
        (sourceInteraction.developer?._id || (await Developer.findByDiscordId(sourceInteraction.user.id))._id),
        key._id,
      );

      await OwnerAuditLog.log({
        ownerDiscordId: sourceInteraction.user.id,
        command: 'api-regenerate',
        action: 'api_key:regenerated',
        targetDiscordId: sourceInteraction.user.id,
        reason: `Regenerated key "${key.name}"`,
      });

      let dmOk = false;
      try {
        await sourceInteraction.user.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xF1C40F)
              .setTitle('API Key Regenerated')
              .setDescription(`Your API key **${result.name}** has been regenerated.`)
              .addFields(
                { name: 'New Key', value: `\`${result.key}\``, inline: false },
                { name: 'Plan', value: result.plan, inline: true },
                { name: 'Scopes', value: (result.scopes || []).join(', '), inline: true },
              )
              .setFooter({ text: 'Save this key — it will not be shown again.' })
              .setTimestamp(),
          ],
        });
        dmOk = true;
      } catch {
        logger.warn({ discordId: sourceInteraction.user.id }, 'Failed to DM regenerated key');
      }

      const successEmbed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle('Key Regenerated')
        .setDescription(dmOk
          ? 'Your API key has been regenerated. Check your DM for the new key.'
          : 'Your API key has been regenerated. Enable DMs so I can send you the new key, then use `/api-my-keys` to see your keys.')
        .setTimestamp();

      await i.update({ embeds: [successEmbed], components: [] });
    } catch (err) {
      logger.error({ err, discordId: sourceInteraction.user.id }, 'Failed to regenerate key');
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

module.exports = apiRegenerateCommand;
