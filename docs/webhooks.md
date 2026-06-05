# Webhooks

Webhooks deliver real-time Discord tracking events to developer endpoints.

## Event Types

| Event | Description |
|-------|-------------|
| `presence.update` | User presence changed |
| `user.update` | User profile updated |
| `guild.member_add` | Member joined guild |
| `guild.member_remove` | Member left guild |
| `message.create` | New message in tracked guild |

## Payload Format

```json
{
  "event": "presence.update",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "data": {
    "userId": "123456789012345678",
    "guildId": "876543210987654321",
    "status": "online",
    "activities": []
  }
}
```

## Configuration

Set webhook URL via the developer dashboard or API. Webhooks are sent with a `X-Zynox-Signature` header for verification.
