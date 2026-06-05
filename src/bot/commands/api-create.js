const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const developerService = require('../../services/developer.service');
const Developer = require('../../models/Developer');
const OwnerAuditLog = require('../../models/OwnerAuditLog');
const config = require('../../config/env');
const logger = require('../../utils/logger');

const cooldowns = new Map();

function getCooldown(userId) {
  const key = `api-create:${userId}`;
  const now = Date.now();
  if (cooldowns.has(key)) {
    const remaining = (cooldowns.get(key) + 30000 - now) / 1000;
    if (remaining > 0) return Math.ceil(remaining);
  }
  cooldowns.set(key, now);
  return 0;
}

async function sendDmSafe(user, content) {
  try {
    await user.send(content);
    return true;
  } catch {
    return false;
  }
}

async function apiCreateCommand(interaction) {
  const cd = getCooldown(interaction.user.id);
  if (cd) {
    await interaction.reply({ content: `Please wait ${cd}s before using this command again.`, ephemeral: true });
    return;
  }

  const name = interaction.options.getString('name');
  if (!name) {
    await interaction.reply({ content: 'Usage: `!api-create <name> [plan] [scopes]`\ne.g. `!api-create mykey free users:read,bot:read`', ephemeral: true });
    return;
  }

  const plan = interaction.options.getString('plan') || 'free';
  const scopesStr = interaction.options.getString('scopes') || 'users:read,bot:read';
  const scopes = scopesStr.split(',').map(s => s.trim()).filter(Boolean);

  const validScopes = ['users:read', 'presence:read', 'bot:read', 'guilds:read'];
  const invalidScopes = scopes.filter(s => !validScopes.includes(s));
  if (invalidScopes.length) {
    await interaction.reply({
      content: `Invalid scopes: ${invalidScopes.join(', ')}. Valid scopes: ${validScopes.join(', ')}`,
      ephemeral: true,
    });
    return;
  }

  const existing = await Developer.findByDiscordId(interaction.user.id);
  if (existing && existing.isBanned) {
    await interaction.reply({ content: 'Your developer account is banned.', ephemeral: true });
    return;
  }

  if (plan !== 'free' && !config.bot.ownerIds.includes(interaction.user.id)) {
    await interaction.reply({
      content: 'Only pro and enterprise plans are not available for self-signup. Contact an owner to upgrade.',
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Confirm API Creation')
    .setDescription('Please confirm the details below:')
    .addFields(
      { name: 'Key Name', value: name, inline: true },
      { name: 'Plan', value: plan, inline: true },
      { name: 'Scopes', value: scopes.join(', '), inline: false },
    )
    .setTimestamp();

  const confirmBtn = new ButtonBuilder()
    .setCustomId('create-confirm')
    .setLabel('Confirm')
    .setStyle(ButtonStyle.Success);
  const cancelBtn = new ButtonBuilder()
    .setCustomId('create-cancel')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);

  const reply = await interaction.reply({
    embeds: [embed],
    components: [row],
    fetchReply: true,
    ephemeral: true,
  });

  const collector = reply.createMessageComponentCollector({
    filter: i => i.user.id === interaction.user.id,
    time: 60000,
    max: 1,
  });

  collector.on('collect', async (i) => {
    if (i.customId === 'create-cancel') {
      await i.update({ embeds: [embed.setDescription('Cancelled.')], components: [] });
      return;
    }

    try {
      const dev = existing || await developerService.createOrUpdateFromDiscord({
        id: interaction.user.id,
        username: interaction.user.username,
        global_name: interaction.user.globalName,
        avatar: interaction.user.avatar,
        email: null,
        locale: interaction.user.locale,
        mfa_enabled: false,
        verified: false,
      });

      if (dev.plan !== plan && config.bot.ownerIds.includes(interaction.user.id)) {
        dev.plan = plan;
        await dev.save();
      }

      const result = await developerService.createApiKey(dev._id, name, { plan, scopes });

      await OwnerAuditLog.log({
        ownerDiscordId: interaction.user.id,
        command: 'api-create',
        action: 'api_key:created',
        targetDiscordId: interaction.user.id,
        reason: `Created key "${name}" with plan ${plan}, scopes ${scopes.join(',')}`,
      });

      const dmOk = await sendDmSafe(interaction.user, {
        embeds: [
          new EmbedBuilder()
            .setColor(0xF1C40F)
            .setTitle('API Key Created')
            .setDescription(`Your API key **${result.name}** has been created.`)
            .addFields(
              { name: 'Key', value: `\`${result.key}\``, inline: false },
              { name: 'Plan', value: result.plan, inline: true },
              { name: 'Scopes', value: (result.scopes || []).join(', '), inline: true },
            )
            .setFooter({ text: 'Save this key — it will not be shown again.' })
            .setTimestamp(),
        ],
      });

      if (!dmOk) {
        logger.warn({ discordId: interaction.user.id }, 'Failed to DM API key');
      }

      const successEmbed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle('API Created')
        .setDescription(dmOk
          ? 'Your API key has been created. Check your DM for the key.'
          : 'Your API key has been created. Enable DMs so I can send you the key, then try `/api-create` again (it will reuse your existing account).')
        .addFields(
          { name: 'Key Name', value: name, inline: true },
          { name: 'Plan', value: plan, inline: true },
        )
        .setTimestamp();

      await i.update({ embeds: [successEmbed], components: [] });
    } catch (err) {
      logger.error({ err, discordId: interaction.user.id }, 'Failed to create API key');
      const errEmbed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('Error')
        .setDescription(err.message || 'Failed to create API key.')
        .setTimestamp();
      await i.update({ embeds: [errEmbed], components: [] });
    }
  });

  collector.on('end', async (collected) => {
    if (collected.size === 0) {
      const timedOut = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle('Timed Out')
        .setDescription('You did not respond in time.')
        .setTimestamp();
      await interaction.editReply({ embeds: [timedOut], components: [] }).catch(() => {});
    }
  });
}

module.exports = apiCreateCommand;
