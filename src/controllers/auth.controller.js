const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { getRedis } = require('../config/redis');
const developerService = require('../services/developer.service');
const { ValidationError, UnauthorizedError } = require('../utils/errors');
const logger = require('../utils/logger');

const discordConfig = {
  authorizeUrl: 'https://discord.com/api/oauth2/authorize',
  tokenUrl: 'https://discord.com/api/oauth2/token',
  apiBase: config.discord.apiBase,
  clientId: config.discord.clientId,
  clientSecret: config.discord.clientSecret,
  redirectUri: config.discord.redirectUri,
  scopes: ['identify', 'guilds', 'email'],
};

async function login(req, res) {
  const sid = Math.random().toString(36).slice(2);
  const state = Buffer.from(
    JSON.stringify({ sid, ts: Date.now() }),
  ).toString('base64');

  const redis = await getRedis();
  await redis.setEx(`oauth:state:${sid}`, 600, state);

  const params = new URLSearchParams({
    client_id: discordConfig.clientId,
    redirect_uri: discordConfig.redirectUri,
    response_type: 'code',
    scope: discordConfig.scopes.join(' '),
    state,
    prompt: 'consent',
  });

  res.redirect(`${discordConfig.authorizeUrl}?${params.toString()}`);
}

async function callback(req, res) {
  const { code, state } = req.query;

  if (!code) {
    throw new ValidationError('Missing authorization code');
  }

  if (!state) {
    throw new ValidationError('Missing state parameter');
  }

  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(state, 'base64').toString());
  } catch {
    throw new ValidationError('Invalid state parameter');
  }

  const redis = await getRedis();
  const storedState = await redis.get(`oauth:state:${parsed.sid}`);
  if (storedState) {
    await redis.del(`oauth:state:${parsed.sid}`);
  }
  if (!storedState || storedState !== state) {
    throw new ValidationError('State mismatch — possible CSRF attack');
  }

  let tokenResponse;
  try {
    const body = new URLSearchParams({
      client_id: discordConfig.clientId,
      client_secret: discordConfig.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: discordConfig.redirectUri,
    });

    const response = await fetch(discordConfig.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errBody = await response.text();
      logger.error({ status: response.status, body: errBody }, 'Discord token exchange failed');
      throw new UnauthorizedError('Failed to exchange authorization code');
    }

    tokenResponse = await response.json();
  } catch (err) {
    if (err.status) throw err;
    throw new UnauthorizedError('Discord OAuth2 token exchange failed');
  }

  const accessToken = tokenResponse.access_token;

  let discordUser;
  try {
    const response = await fetch(`${discordConfig.apiBase}/users/@me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new UnauthorizedError('Failed to fetch Discord user');
    }

    discordUser = await response.json();
  } catch (err) {
    if (err.status) throw err;
    throw new UnauthorizedError('Failed to fetch Discord profile');
  }

  const developer = await developerService.createOrUpdateFromDiscord(discordUser);

  const token = jwt.sign(
    {
      sub: String(developer._id),
      discordId: developer.discordId,
      username: developer.username,
      role: developer.role,
      plan: developer.plan,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn },
  );

  const wantsJson = req.query.json === 'true' || req.accepts('html') !== 'html';
  if (wantsJson) {
    return res.json({
      success: true,
      token,
      developer: developer.toSafe(),
      expiresIn: config.jwt.expiresIn,
    });
  }

  res.redirect(`${config.server.frontendUrl}/auth/callback?token=${encodeURIComponent(token)}`);
}

async function refreshToken(req, res) {
  const developer = req.developer;

  const token = jwt.sign(
    {
      sub: String(developer.id),
      discordId: developer.discordId,
      username: developer.username,
      role: developer.role,
      plan: developer.plan,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn },
  );

  res.json({
    success: true,
    token,
    expiresIn: config.jwt.expiresIn,
  });
}

async function logout(req, res) {
  res.json({ success: true, message: 'Logged out (discard your token client-side)' });
}

module.exports = { login, callback, refreshToken, logout };
