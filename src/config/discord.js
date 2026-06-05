const config = require('./env');

module.exports = {
  clientId: config.discord.clientId,
  clientSecret: config.discord.clientSecret,
  botToken: config.discord.botToken,
  redirectUri: config.discord.redirectUri,
  apiBase: config.discord.apiBase,
  inviteUrl: config.discord.inviteUrl,

  scopes: ['identify', 'guilds'],
  authorizeUrl: 'https://discord.com/api/oauth2/authorize',
  tokenUrl: 'https://discord.com/api/oauth2/token',
  revokeUrl: 'https://discord.com/api/oauth2/token/revoke',

  getAuthorizationUrl(state) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.scopes.join(' '),
      state,
    });
    return `${this.authorizeUrl}?${params.toString()}`;
  },
};
