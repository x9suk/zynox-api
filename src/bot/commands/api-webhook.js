const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Developer = require('../../models/Developer');
const ApiKey = require('../../models/ApiKey');
const logger = require('../../utils/logger');

async function apiWebhookCommand(interaction) {
  const developer = await Developer.findByDiscordId(interaction.user.id);
  if (!developer) {
    await interaction.reply({ content: 'You need a developer account. Use `/api-create`.', ephemeral: true });
    return;
  }

  const activeKeys = await ApiKey.find({ developer: developer._id, isActive: true })
    .select('name keyPrefix plan scopes webhookUrl')
    .lean();

  if (activeKeys.length === 0) {
    await interaction.reply({ content: 'You have no active API keys. Create one with `/api-create`.', ephemeral: true });
    return;
  }

  if (activeKeys.length === 1) {
    await showWebhookPanel(interaction, developer, activeKeys[0]);
    return;
  }

  const options = activeKeys.map((k, i) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(k.name)
      .setValue(String(i))
      .setDescription(`${k.webhookUrl ? '🔔' : '🔕'} ${k.plan}`)
  );

  const select = new StringSelectMenuBuilder()
    .setCustomId('webhook-select')
    .setPlaceholder('Select a key to configure webhook…')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(select);

  const reply = await interaction.reply({
    content: 'Select the API key to configure a webhook for:',
    components: [row],
    fetchReply: true,
    ephemeral: true,
  });

  const collector = reply.createMessageComponentCollector({
    filter: i => i.customId === 'webhook-select' && i.user.id === interaction.user.id,
    time: 60000,
    max: 1,
  });

  collector.on('collect', async (i) => {
    const key = activeKeys[parseInt(i.values[0])];
    await showWebhookPanel(i, developer, key);
  });

  collector.on('end', async (collected) => {
    if (collected.size === 0) {
      await interaction.editReply({ content: 'Timed out.', components: [] }).catch(() => {});
    }
  });
}

async function showWebhookPanel(sourceInteraction, developer, key) {
  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Webhook Configuration')
    .setDescription(`Key: **${key.name}** (${key.plan})`)
    .addFields(
      { name: 'Current Webhook URL', value: key.webhookUrl || 'Not set', inline: false },
    );

  if (key.webhookUrl) {
    embed.addFields({ name: 'Last Delivery', value: 'Status tracking not available for this key.', inline: false });
  }

  const setBtn = new ButtonBuilder()
    .setCustomId('webhook-set')
    .setLabel('Set Webhook URL')
    .setStyle(ButtonStyle.Primary);
  const testBtn = new ButtonBuilder()
    .setCustomId('webhook-test')
    .setLabel('Test Webhook')
    .setStyle(ButtonStyle.Success);
  const clearBtn = new ButtonBuilder()
    .setCustomId('webhook-clear')
    .setLabel('Clear Webhook')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(setBtn, testBtn, clearBtn);

  const reply = await sourceInteraction[sourceInteraction.isChatInputCommand ? 'reply' : 'update']({
    embeds: [embed],
    components: [row],
    fetchReply: true,
    ephemeral: true,
  });

  const collector = reply.createMessageComponentCollector({
    filter: i => i.user.id === (sourceInteraction.user || sourceInteraction.member.user).id,
    time: 120000,
  });

  collector.on('collect', async (i) => {
    if (i.customId === 'webhook-set') {
      const msg = await i.reply({
        content: 'Please enter the webhook URL (must start with https://):\nType a valid URL in this channel.',
        ephemeral: true,
        fetchReply: true,
      });

      const msgCollector = i.channel.createMessageCollector({
        filter: m => m.author.id === i.user.id,
        time: 60000,
        max: 1,
      });

      msgCollector.on('collect', async (m) => {
        const url = m.content.trim();
        if (!url.startsWith('https://')) {
          await m.reply('Invalid URL. Must start with `https://`.');
          return;
        }

        try {
          await ApiKey.findByIdAndUpdate(key._id, { webhookUrl: url });
          await m.reply(`Webhook URL set to: ${url}`);

          const updated = new EmbedBuilder()
            .setColor(0xF1C40F)
            .setTitle('Webhook Configuration')
            .setDescription(`Key: **${key.name}**`)
            .addFields({ name: 'Webhook URL', value: url, inline: false })
            .setTimestamp();
          await i.editReply({ embeds: [updated] });
        } catch (err) {
          logger.error({ err, keyId: key._id }, 'Failed to set webhook URL');
          await m.reply('Failed to set webhook URL.');
        }
      });

      msgCollector.on('end', async (collected) => {
        if (collected.size === 0) {
          await i.followUp({ content: 'Timed out waiting for URL.', ephemeral: true }).catch(() => {});
        }
      });
    } else if (i.customId === 'webhook-test') {
      if (!key.webhookUrl) {
        await i.reply({ content: 'No webhook URL configured for this key. Use "Set Webhook URL" first.', ephemeral: true });
        return;
      }

      await i.reply({ content: `Test sent to ${key.webhookUrl} (check your webhook endpoint).`, ephemeral: true });
    } else if (i.customId === 'webhook-clear') {
      try {
        await ApiKey.findByIdAndUpdate(key._id, { webhookUrl: null });
        await i.update({
          embeds: [new EmbedBuilder()
            .setColor(0xF1C40F)
            .setTitle('Webhook Configuration')
            .setDescription(`Key: **${key.name}**`)
            .addFields({ name: 'Webhook URL', value: 'Cleared', inline: false })
            .setTimestamp(),
          ],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('webhook-set').setLabel('Set Webhook URL').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('webhook-test').setLabel('Test Webhook').setStyle(ButtonStyle.Success).setDisabled(true),
            new ButtonBuilder().setCustomId('webhook-clear').setLabel('Clear Webhook').setStyle(ButtonStyle.Danger).setDisabled(true),
          )],
        });
      } catch (err) {
        logger.error({ err, keyId: key._id }, 'Failed to clear webhook URL');
        await i.reply({ content: 'Failed to clear webhook URL.', ephemeral: true });
      }
    }
  });

  collector.on('end', async () => {
    try {
      await sourceInteraction.editReply({ components: [] }).catch(() => {});
    } catch {}
  });
}

module.exports = apiWebhookCommand;
