const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');

describe('Socket.IO Connection', () => {
  let io, clientSocket, httpServer;

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer, { cors: { origin: '*' } });

    io.use((socket, next) => {
      const key = socket.handshake.query['x-api-key'];
      if (!key) return next(new Error('Missing x-api-key'));
      socket.apiKey = { id: 'test', scopes: ['*'] };
      next();
    });

    io.on('connection', (socket) => {
      socket.on('subscribe', (channel, callback) => {
        socket.join(channel);
        if (typeof callback === 'function') {
          callback({ success: true, channel });
        }
      });
      socket.on('unsubscribe', (channel) => {
        socket.leave(channel);
      });
      socket.on('ping', (callback) => {
        if (typeof callback === 'function') {
          callback({ success: true, time: Date.now() });
        }
      });
    });

    httpServer.listen(() => {
      const port = httpServer.address().port;
      clientSocket = Client(`http://localhost:${port}`, {
        query: { 'x-api-key': 'test_key' },
        transports: ['websocket'],
        forceNew: true,
      });
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    if (clientSocket) clientSocket.close();
    if (io) io.close();
    if (httpServer) httpServer.close();
  });

  test('should connect successfully', () => {
    expect(clientSocket.connected).toBe(true);
  });

  test('should reject connection without API key', (done) => {
    const badSocket = Client(`http://localhost:${httpServer.address().port}`, {
      transports: ['websocket'],
      forceNew: true,
    });
    badSocket.on('connect_error', (err) => {
      expect(err.message).toBe('Missing x-api-key');
      badSocket.close();
      done();
    });
  });

  test('should subscribe to a room', (done) => {
    clientSocket.emit('subscribe', 'presence:all', (response) => {
      expect(response.success).toBe(true);
      expect(response.channel).toBe('presence:all');
      done();
    });
  });

  test('should unsubscribe from a room', (done) => {
    clientSocket.emit('subscribe', 'bot:all');
    clientSocket.emit('unsubscribe', 'bot:all');
    done();
  });

  test('should handle ping', (done) => {
    clientSocket.emit('ping', (response) => {
      expect(response.success).toBe(true);
      expect(response.time).toBeGreaterThan(0);
      done();
    });
  });
});
