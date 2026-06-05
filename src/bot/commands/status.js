const { EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const { getRedis } = require('../../config/redis');
const { getHealth } = require('../../services/botHealth.service');
const Developer = require('../../models/Developer');
const ApiKey = require('../../models/ApiKey');

async function statusCommand(interaction) {
  const mongoState = ['❌ Disconnected', '✅ Connected', '⏳ Connecting', '⏳ Disconnecting'];
  const mongoStatus = mongoose.connection.readyState;

  let redisOk = false;
  try {
    const redis = await getRedis();
    await redis.ping();
    redisOk = true;
  } catch {}

  const botHealth = getHealth();
  const uptime = Math.floor(process.uptime());
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);

  const totalDevs = await Developer.countDocuments();
  const totalKeys = await ApiKey.countDocuments();
  const activeKeys = await ApiKey.countDocuments({ isActive: true });

  const mem = process.memoryUsage();

  const embed = new EmbedBuilder()
    .setColor(0xF1C40F)
    .setTitle('Zynox Tracking API — System Status')
    .addFields(
      { name: '🖥️ API Server', value: `Online · Uptime: ${days}d ${hours}h ${minutes}m`, inline: false },
      { name: '🗄️ MongoDB', value: mongoState[mongoStatus] || 'Unknown', inline: true },
      { name: '⚡ Redis', value: redisOk ? '✅ Connected' : '❌ Disconnected', inline: true },
      { name: '🤖 Bot', value: botHealth.status === 'connected' ? '✅ Connected' : `⚠️ ${botHealth.status}`, inline: true },
      { name: '📡 WS Ping', value: `${interaction.client.ws.ping}ms`, inline: true },
      { name: '⚠️ Unstable', value: botHealth.unstable ? '⚠️ Yes' : '✅ No', inline: true },
      { name: '👥 Developers', value: `${totalDevs}`, inline: true },
      { name: '🔑 API Keys', value: `${totalKeys} total / ${activeKeys} active`, inline: true },
      { name: '📊 Memory', value: `RSS: ${(mem.rss / 1024 / 1024).toFixed(1)} MB\nHeap: ${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`, inline: true },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

module.exports = statusCommand;
