const { redisGet, redisSet, redisDel, redisTTL, getRedis } = require('../config/redis');
const config = require('../config/env');

const p = config.redis.prefix;

const TTL = {
  USER_PRESENCE: 120,
  BOT_STATS: 30,
  GUILD_STATS: 60,
  USER_PROFILE: 600,
};

const cacheService = {
  // ─── User Presence ──────────────────────────────────────
  async setUserPresence(discordId, data) {
    const key = `${p}presence:user:${discordId}`;
    await redisSet(key, data, TTL.USER_PRESENCE);
  },

  async getUserPresence(discordId) {
    const key = `${p}presence:user:${discordId}`;
    return redisGet(key);
  },

  async deleteUserPresence(discordId) {
    const key = `${p}presence:user:${discordId}`;
    await redisDel(key);
  },

  async setUserPresenceField(discordId, field, value) {
    const key = `${p}presence:user:${discordId}`;
    const existing = (await redisGet(key)) || {};
    existing[field] = value;
    await redisSet(key, existing, TTL.USER_PRESENCE);
  },

  // ─── Bot Stats ───────────────────────────────────────────
  async setBotStats(botId, data) {
    const key = `${p}bot:stats:${botId}`;
    await redisSet(key, data, TTL.BOT_STATS);
  },

  async getBotStats(botId) {
    const key = `${p}bot:stats:${botId}`;
    return redisGet(key);
  },

  // ─── Guild Stats ─────────────────────────────────────────
  async setGuildStats(guildId, data) {
    const key = `${p}guild:stats:${guildId}`;
    await redisSet(key, data, TTL.GUILD_STATS);
  },

  async getGuildStats(guildId) {
    const key = `${p}guild:stats:${guildId}`;
    return redisGet(key);
  },

  async deleteGuildStats(guildId) {
    const key = `${p}guild:stats:${guildId}`;
    await redisDel(key);
  },

  // ─── Guild Member Counts ─────────────────────────────────
  async setGuildMemberCounts(guildId, counts) {
    const key = `${p}guild:members:${guildId}`;
    await redisSet(key, counts, TTL.GUILD_STATS);
  },

  async getGuildMemberCounts(guildId) {
    const key = `${p}guild:members:${guildId}`;
    return redisGet(key);
  },

  // ─── Voice State Cache ───────────────────────────────────
  async setVoiceState(guildId, userId, data) {
    const key = `${p}voice:${guildId}:${userId}`;
    await redisSet(key, data, 300);
  },

  async getVoiceState(guildId, userId) {
    const key = `${p}voice:${guildId}:${userId}`;
    return redisGet(key);
  },

  async deleteVoiceState(guildId, userId) {
    const key = `${p}voice:${guildId}:${userId}`;
    await redisDel(key);
  },

  async getVoiceUsers(guildId) {
    const redis = await getRedis();
    const pattern = `${p}voice:${guildId}:*`;
    const keys = await redis.keys(pattern);
    if (!keys.length) return [];
    const values = await redis.mGet(keys);
    return values.map((v) => (v ? JSON.parse(v) : null)).filter(Boolean);
  },

  // ─── Socket Session ──────────────────────────────────────
  async setSocketSession(socketId, data) {
    const key = `${p}socket:${socketId}`;
    await redisSet(key, data, 86400);
  },

  async getSocketSession(socketId) {
    const key = `${p}socket:${socketId}`;
    return redisGet(key);
  },

  async deleteSocketSession(socketId) {
    const key = `${p}socket:${socketId}`;
    await redisDel(key);
  },

  // ─── Generic ─────────────────────────────────────────────
  async set(key, data, ttlSeconds = 300) {
    await redisSet(key, data, ttlSeconds);
  },

  async get(key) {
    return redisGet(key);
  },

  async del(key) {
    await redisDel(key);
  },

  async getTTL(key) {
    return redisTTL(key);
  },

  async flushPrefix(prefix) {
    const redis = await getRedis();
    const pattern = `${p}${prefix}*`;
    const keys = await redis.keys(pattern);
    if (keys.length) {
      await redis.del(keys);
    }
    return keys.length;
  },
};

module.exports = cacheService;
