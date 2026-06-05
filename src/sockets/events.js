const { getAvailableRooms } = require('./auth');
const logger = require('../utils/logger');

function setupSocketEvents(socket) {
  const rooms = getAvailableRooms(socket.apiKey.scopes);

  socket.on('subscribe', async (channel, callback) => {
    try {
      const validChannels = [...rooms, ...rooms.map((r) => r.replace(':all', ''))];

      if (!validChannels.includes(channel) && !channel.startsWith('guild:')) {
        const response = { success: false, error: `Invalid channel: ${channel}` };
        if (typeof callback === 'function') callback(response);
        else socket.emit('subscribe:error', response.error);
        return;
      }

      if (channel.startsWith('guild:')) {
        const guildId = channel.split(':')[1];
        if (!guildId || !/^\d{17,20}$/.test(guildId)) {
          const response = { success: false, error: 'Invalid guild ID' };
          if (typeof callback === 'function') callback(response);
          else socket.emit('subscribe:error', response.error);
          return;
        }
      }

      await socket.join(channel);
      if (!socket.subscribedRooms) socket.subscribedRooms = [];
      if (!socket.subscribedRooms.includes(channel)) {
        socket.subscribedRooms.push(channel);
      }

      const response = { success: true, channel };
      if (typeof callback === 'function') callback(response);

      logger.debug({ socketId: socket.id, channel, userId: socket.developer?.discordId }, 'Socket subscribed');
    } catch (err) {
      logger.error({ err, socketId: socket.id, channel }, 'Socket subscribe error');
      const response = { success: false, error: 'Internal error' };
      if (typeof callback === 'function') callback(response);
    }
  });

  socket.on('unsubscribe', async (channel, callback) => {
    try {
      await socket.leave(channel);
      if (socket.subscribedRooms) {
        socket.subscribedRooms = socket.subscribedRooms.filter((r) => r !== channel);
      }

      const response = { success: true, channel };
      if (typeof callback === 'function') callback(response);

      logger.debug({ socketId: socket.id, channel }, 'Socket unsubscribed');
    } catch (err) {
      logger.error({ err, socketId: socket.id, channel }, 'Socket unsubscribe error');
      const response = { success: false, error: 'Internal error' };
      if (typeof callback === 'function') callback(response);
    }
  });

  socket.on('list:rooms', (callback) => {
    const available = {
      rooms,
      subscribed: socket.subscribedRooms || [],
    };
    if (typeof callback === 'function') callback({ success: true, ...available });
    else socket.emit('rooms', available);
  });

  socket.on('ping', (callback) => {
    if (typeof callback === 'function') callback({ success: true, time: Date.now() });
  });
}

module.exports = setupSocketEvents;
