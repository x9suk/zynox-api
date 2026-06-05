const { EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const { getRedis } = require('../../config/redis');
const { getHealth } = require('../../services/botHealth.service');

async function apiStatusCommand(interaction) {
  const mongoState = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const mongoStatus = mongoose.connection.readyState;

  let redisOk = false;
  try {
    const redis = await getRedis();
    await redis.ping();
    redisOk = true;
  } catch {
    redisOk = false;
  }

  const botHealth = getHealth();
  const uptime = Math.floor(process.uptime());
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Zynox Tracking API — Status')
    .addFields(
      {
        name: 'API Server',
        value: '✅ Online',
        inline: true,
      },
      {
        name: 'MongoDB',
        value: mongoStatus === 1 ? '✅ Connected' : `❌ ${mongoState[mongoStatus]}`,
        inline: true,
      },
      {
        name: 'Redis',
        value: redisOk ? '✅ Connected' : '❌ Disconnected',
        inline: true,
      },
      {
        name: 'Bot Status',
        value: botHealth.status === 'connected' ? '✅ Connected' : `⚠️ ${botHealth.status}`,
        inline: true,
      },
      {
        name: 'Bot Unstable',
        value: botHealth.unstable ? '⚠️ Yes' : '✅ No',
        inline: true,
      },
      {
        name: 'API Uptime',
        value: `${days}d ${hours}h ${minutes}m`,
        inline: true,
      },
      {
        name: 'Reconnects',
        value: `${botHealth.reconnectAttempts}`,
        inline: true,
      },
      {
        name: 'WS Ping',
        value: `${interaction.client.ws.ping}ms`,
        inline: true,
      },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

module.exports = apiStatusCommand;
