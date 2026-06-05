const { Events } = require('discord.js');
const readyHandler = require('./ready');
const presenceUpdateHandler = require('./presenceUpdate');
const guildCreateHandler = require('./guildCreate');
const guildDeleteHandler = require('./guildDelete');
const guildMemberAddHandler = require('./guildMemberAdd');
const guildMemberRemoveHandler = require('./guildMemberRemove');
const voiceStateUpdateHandler = require('./voiceStateUpdate');
const interactionCreateHandler = require('./interactionCreate');
const messageCreateHandler = require('./messageCreate');
const channelCreateHandler = require('./channelCreate');
const channelDeleteHandler = require('./channelDelete');
const guildEmojisUpdateHandler = require('./guildEmojisUpdate');

function registerEvents(client) {
  client.once(Events.ClientReady, (c) => readyHandler.readyHandler(c));
  client.on(Events.PresenceUpdate, (o, n) => presenceUpdateHandler(o, n));
  client.on(Events.GuildCreate, (g) => guildCreateHandler(g));
  client.on(Events.GuildDelete, (g) => guildDeleteHandler(g));
  client.on(Events.GuildMemberAdd, (m) => guildMemberAddHandler(m));
  client.on(Events.GuildMemberRemove, (m) => guildMemberRemoveHandler(m));
  client.on(Events.VoiceStateUpdate, (o, n) => voiceStateUpdateHandler(o, n));
  client.on(Events.InteractionCreate, (i) => interactionCreateHandler(i));
  client.on(Events.MessageCreate, (m) => messageCreateHandler(m));
  client.on(Events.ChannelCreate, (c) => channelCreateHandler(c));
  client.on(Events.ChannelDelete, (c) => channelDeleteHandler(c));
  client.on(Events.GuildEmojisUpdate, (g, o, n) => guildEmojisUpdateHandler(g, o, n));
}

module.exports = registerEvents;
