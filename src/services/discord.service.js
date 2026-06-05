const config = require('../config/env');
const logger = require('../utils/logger');

const discordService = {
  async fetchUser(userId) {
    const response = await fetch(`${config.discord.apiBase}/users/${userId}`, {
      headers: { Authorization: `Bot ${config.discord.botToken}` },
    });
    if (!response.ok) {
      if (response.status === 429) {
        const retry = response.headers.get('Retry-After');
        logger.warn({ retryAfter: retry }, 'Discord rate limited while fetching user');
      }
      return null;
    }
    return response.json();
  },

  async fetchGuild(guildId) {
    const response = await fetch(`${config.discord.apiBase}/guilds/${guildId}`, {
      headers: { Authorization: `Bot ${config.discord.botToken}` },
    });
    if (!response.ok) return null;
    return response.json();
  },

  async fetchGuildMember(guildId, userId) {
    const response = await fetch(`${config.discord.apiBase}/guilds/${guildId}/members/${userId}`, {
      headers: { Authorization: `Bot ${config.discord.botToken}` },
    });
    if (!response.ok) return null;
    return response.json();
  },

  async fetchBotGateway() {
    const response = await fetch(`${config.discord.apiBase}/gateway/bot`, {
      headers: { Authorization: `Bot ${config.discord.botToken}` },
    });
    if (!response.ok) return null;
    return response.json();
  },

  async fetchCurrentUser() {
    const response = await fetch(`${config.discord.apiBase}/users/@me`, {
      headers: { Authorization: `Bot ${config.discord.botToken}` },
    });
    if (!response.ok) return null;
    return response.json();
  },

  buildAvatarUrl(userId, avatarHash, size = 256) {
    if (!avatarHash) return null;
    const ext = avatarHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=${size}`;
  },

  buildGuildIconUrl(guildId, iconHash, size = 256) {
    if (!iconHash) return null;
    const ext = iconHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${ext}?size=${size}`;
  },

  buildBannerUrl(userId, bannerHash, size = 512) {
    if (!bannerHash) return null;
    const ext = bannerHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/banners/${userId}/${bannerHash}.${ext}?size=${size}`;
  },
};

module.exports = discordService;
