# Zynox Tracking API — WebSocket (Socket.IO) Documentation

Socket.IO server shares the same HTTP server as the REST API.

Base URL: `http://localhost:3000` (or `wss://yourdomain.com` in production)

---

## Authentication

Authenticate via the `x-api-key` query parameter in the handshake:

```js
const socket = io('http://localhost:3000', {
  query: { 'x-api-key': 'zynox_abc123...' }
});
```

Or via the `auth` option:

```js
const socket = io('http://localhost:3000', {
  auth: { token: 'zynox_abc123...' }
});
```

### Authentication Errors

If authentication fails, the connection is rejected with an error message:

```js
socket.on('connect_error', (err) => {
  console.error('Connection failed:', err.message);
});
```

Possible errors:
- `Missing x-api-key`
- `Invalid API key`
- `API key is disabled`
- `API key has expired`
- `Account is banned`
- `IP is temporarily blocked`

---

## Available Rooms

Rooms are determined by your API key's scopes. After connecting, you can list available rooms:

```js
socket.emit('list:rooms', (response) => {
  console.log(response);
  // { success: true, rooms: ['presence:all', 'bot:all'], subscribed: [] }
});
```

| Room | Required Scope | Description |
|------|---------------|-------------|
| `presence:all` | `presence:read` or `*` | All user presence updates |
| `bot:all` | `bot:read` or `*` | Bot stats updates |
| `guild:{guildId}` | `guilds:read` or `*` | Guild stats, member, and voice updates for a specific guild |

---

## Subscribing to Rooms

```js
// Subscribe to presence updates
socket.emit('subscribe', 'presence:all', (response) => {
  if (response.success) {
    console.log('Subscribed to presence:all');
  }
});

// Subscribe to bot stats
socket.emit('subscribe', 'bot:all');

// Subscribe to a specific guild
socket.emit('subscribe', 'guild:876543210987654321');
```

The `subscribe` event accepts a callback (ACK):

```js
socket.emit('subscribe', 'presence:all', (res) => {
  // res = { success: true, channel: 'presence:all' }
  // or { success: false, error: '...' }
});
```

---

## Unsubscribing

```js
socket.emit('unsubscribe', 'presence:all');
```

---

## Events

### `presence:update`

Emitted when a user's presence changes (status, activity, etc.).

```js
socket.on('presence:update', (data) => {
  console.log('Presence update:', data);
  // {
  //   userId: "123456789012345678",
  //   data: {
  //     userId: "123456789012345678",
  //     guildId: "876543210987654321",
  //     status: "online",
  //     activities: [...],
  //     clientStatus: { desktop: "online", mobile: null, web: null }
  //   },
  //   timestamp: "2025-01-01T12:00:00.000Z"
  // }
});
```

---

### `bot:stats:update`

Emitted every 30 seconds with fresh bot statistics.

```js
socket.on('bot:stats:update', (data) => {
  console.log('Bot stats:', data);
  // {
  //   botId: "...",
  //   data: {
  //     uptime: 3600,
  //     ping: 42,
  //     guildCount: 10,
  //     userCount: 5000,
  //     ...
  //   },
  //   timestamp: "..."
  // }
});
```

---

### `guild:stats:update`

Emitted every 60 seconds and on member/voice changes for each guild.

```js
socket.on('guild:stats:update', (data) => {
  console.log('Guild stats:', data);
  // {
  //   guildId: "876543210987654321",
  //   data: { memberCount: 500, onlineCount: 120, ... },
  //   timestamp: "..."
  // }
});
```

---

### `guild:member:update`

Emitted when a member joins or leaves a guild.

```js
socket.on('guild:member:update', (data) => {
  console.log('Member update:', data);
  // {
  //   guildId: "876543210987654321",
  //   userId: "123456789012345678",
  //   action: "join" | "leave",
  //   data: { userId: "...", username: "johndoe", joinedAt/leftAt: "..." },
  //   timestamp: "..."
  // }
});
```

---

### `voice:update`

Emitted when a user joins, leaves, or moves between voice channels.

```js
socket.on('voice:update', (data) => {
  console.log('Voice update:', data);
  // {
  //   guildId: "876543210987654321",
  //   userId: "123456789012345678",
  //   data: {
  //     action: "join" | "leave" | "move",
  //     userId: "...",
  //     userName: "johndoe",
  //     channelId: "...",
  //     channelName: "General",
  //     joinedAt: 1700000000000,
  //     ...
  //   },
  //   timestamp: "..."
  // }
});
```

---

## Client Example (Node.js)

```js
const { io } = require('socket.io-client');

const socket = io('http://localhost:3000', {
  query: { 'x-api-key': 'zynox_your_key_here' },
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);

  socket.emit('subscribe', 'presence:all');
  socket.emit('subscribe', 'bot:all');
  socket.emit('subscribe', 'guild:876543210987654321');
});

socket.on('presence:update', (data) => {
  console.log(`${data.data.status}: ${data.userId}`);
});

socket.on('bot:stats:update', (data) => {
  console.log(`Bot: ${data.data.guildCount} guilds, ${data.data.ping}ms ping`);
});

socket.on('guild:stats:update', (data) => {
  console.log(`Guild ${data.guildId}: ${data.data.memberCount} members`);
});

socket.on('voice:update', (data) => {
  console.log(`Voice ${data.data.action}: ${data.userId} in ${data.data.channelName}`);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

---

## Client Example (Browser)

```html
<script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
<script>
  const socket = io('http://localhost:3000', {
    query: { 'x-api-key': 'zynox_your_key_here' }
  });

  socket.on('connect', () => {
    socket.emit('subscribe', 'presence:all');
  });

  socket.on('presence:update', (data) => {
    const el = document.getElementById('presence');
    el.innerHTML = `${data.userId}: ${data.data.status}`;
  });
</script>
```

---

## Ping/Pong

```js
socket.emit('ping', (response) => {
  console.log('Server time:', response.time);
});
```

---

## Webhooks (Alternative to Socket.IO)

If you prefer server-to-server event delivery over persistent Socket.IO connections, you can configure **webhooks** on your API keys. Events are delivered via HTTP POST with HMAC-SHA256 signing.

| Feature | Socket.IO | Webhooks |
|---------|-----------|----------|
| Connection | Persistent (WebSocket) | Stateless (HTTP POST) |
| Events | All 5 realtime events | Same 5 events |
| Auth | `x-api-key` in handshake | HMAC-SHA256 signature |
| Retry | N/A (persistent) | 3 attempts with backoff |
| Plan | Free+ | Enterprise only |

Configure webhooks via the developer dashboard or API:

```http
PATCH /api/v1/developer/keys/:id
Content-Type: application/json

{ "webhookUrl": "https://myapp.com/webhook", "webhookSecret": "my_secret" }
```

Test your webhook:

```http
POST /api/v1/developer/keys/:id/test-webhook
```

See [API.md](API.md) for full webhook documentation.
