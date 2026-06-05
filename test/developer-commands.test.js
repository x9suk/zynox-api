jest.mock('../src/models/Developer');
jest.mock('../src/models/ApiKey');
jest.mock('../src/models/Subscription');
jest.mock('../src/models/OwnerAuditLog');
jest.mock('../src/services/developer.service');
jest.mock('../src/services/rateLimit.service');

const Developer = require('../src/models/Developer');
const ApiKey = require('../src/models/ApiKey');
const Subscription = require('../src/models/Subscription');
const OwnerAuditLog = require('../src/models/OwnerAuditLog');
const developerService = require('../src/services/developer.service');
const rateLimitService = require('../src/services/rateLimit.service');

let userIdCounter = 1000;

function createMockInteraction(options = {}) {
  userIdCounter++;
  const uid = String(userIdCounter);
  return {
    user: {
      id: uid,
      username: 'testuser',
      globalName: 'Test User',
      avatar: null,
      locale: 'en-US',
      send: jest.fn(),
    },
    member: { user: { id: uid } },
    options: {
      getString: jest.fn((name) => options[name] || null),
      getInteger: jest.fn(() => null),
    },
    reply: jest.fn().mockResolvedValue({
      createMessageComponentCollector: jest.fn(() => ({
        on: jest.fn(),
        off: jest.fn(),
      })),
    }),
    editReply: jest.fn(),
    followUp: jest.fn(),
    isChatInputCommand: () => true,
    isCommand: () => true,
    replied: false,
    deferred: false,
    createdTimestamp: Date.now(),
    guild: { id: '123' },
    channel: { id: '456' },
    client: {},
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('api-create command', () => {
  let apiCreateCommand;

  beforeAll(async () => {
    apiCreateCommand = require('../src/bot/commands/api-create');
  });

  it('replies with ephemeral message for banned user', async () => {
    Developer.findByDiscordId.mockResolvedValue({ isBanned: true, plan: 'free' });

    const interaction = createMockInteraction({ name: 'mykey', plan: 'free', scopes: 'users:read' });
    await apiCreateCommand(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('banned'), ephemeral: true }),
    );
  });

  it('rejects non-free plan for non-owner users', async () => {
    Developer.findByDiscordId.mockResolvedValue(null);

    const interaction = createMockInteraction({ name: 'mykey', plan: 'pro', scopes: 'users:read' });
    await apiCreateCommand(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('not available'), ephemeral: true }),
    );
  });

  it('rejects invalid scopes', async () => {
    Developer.findByDiscordId.mockResolvedValue(null);

    const interaction = createMockInteraction({ name: 'mykey', plan: 'free', scopes: 'invalid:scope' });
    await apiCreateCommand(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('Invalid scopes'), ephemeral: true }),
    );
  });

  it('shows confirmation embed for valid creation', async () => {
    Developer.findByDiscordId.mockResolvedValue(null);

    const interaction = createMockInteraction({ name: 'mykey', plan: 'free', scopes: 'users:read,bot:read' });
    await apiCreateCommand(interaction);

    const callArg = interaction.reply.mock.calls[0][0];
    expect(callArg.embeds[0]).toBeDefined();
    const embedData = callArg.embeds[0].data || callArg.embeds[0];
    expect(embedData.title).toBe('Confirm API Creation');
  });
});

describe('api-my-status command', () => {
  let apiMyStatusCommand;

  beforeAll(async () => {
    apiMyStatusCommand = require('../src/bot/commands/api-my-status');
  });

  it('shows status for existing developer', async () => {
    Developer.findByDiscordId.mockResolvedValue({
      _id: 'dev1',
      discordId: '111',
      username: 'testuser',
      globalName: 'Test User',
      plan: 'pro',
      role: 'developer',
      isBanned: false,
      apiKeyCount: 3,
      dailyUsage: { count: 50, date: new Date().toISOString().slice(0, 10) },
      createdAt: new Date(),
      getPlanLimits: () => ({ dailyLimit: 10000, maxKeys: 25 }),
    });
    ApiKey.countDocuments.mockResolvedValue(3);
    Subscription.getActiveForDeveloper.mockResolvedValue({ plan: 'pro', status: 'active' });

    const interaction = createMockInteraction();
    await apiMyStatusCommand(interaction);

    const callArg = interaction.reply.mock.calls[0][0];
    expect(callArg.embeds[0]).toBeDefined();
    const embedData = callArg.embeds[0].data || callArg.embeds[0];
    expect(embedData.title).toBe('Developer Account Status');
    expect(callArg.ephemeral).toBe(true);
  });

  it('prompts to create account when no developer exists', async () => {
    Developer.findByDiscordId.mockResolvedValue(null);

    const interaction = createMockInteraction();
    await apiMyStatusCommand(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('api-create'), ephemeral: true }),
    );
  });
});

describe('api-revoke command', () => {
  let apiRevokeCommand;

  beforeAll(async () => {
    apiRevokeCommand = require('../src/bot/commands/api-revoke');
  });

  it('replies ephemeral when no developer exists', async () => {
    Developer.findByDiscordId.mockResolvedValue(null);

    const interaction = createMockInteraction();
    await apiRevokeCommand(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('api-create'), ephemeral: true }),
    );
  });

  it('replies ephemeral when developer is banned', async () => {
    Developer.findByDiscordId.mockResolvedValue({ _id: 'dev1', isBanned: true });

    const interaction = createMockInteraction();
    await apiRevokeCommand(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('banned'), ephemeral: true }),
    );
  });

  it('replies ephemeral when no active keys exist', async () => {
    Developer.findByDiscordId.mockResolvedValue({ _id: 'dev1', isBanned: false });
    ApiKey.find.mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) });

    const interaction = createMockInteraction();
    await apiRevokeCommand(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('no active'), ephemeral: true }),
    );
  });
});

describe('api-regenerate command', () => {
  let apiRegenerateCommand;

  beforeAll(async () => {
    apiRegenerateCommand = require('../src/bot/commands/api-regenerate');
  });

  it('replies ephemeral when no developer exists', async () => {
    Developer.findByDiscordId.mockResolvedValue(null);

    const interaction = createMockInteraction();
    await apiRegenerateCommand(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('api-create'), ephemeral: true }),
    );
  });

  it('replies ephemeral when developer is banned', async () => {
    Developer.findByDiscordId.mockResolvedValue({ _id: 'dev1', isBanned: true });

    const interaction = createMockInteraction();
    await apiRegenerateCommand(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('banned'), ephemeral: true }),
    );
  });

  it('replies ephemeral when no active keys exist', async () => {
    Developer.findByDiscordId.mockResolvedValue({ _id: 'dev1', isBanned: false });
    ApiKey.find.mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) });

    const interaction = createMockInteraction();
    await apiRegenerateCommand(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining('no active'), ephemeral: true }),
    );
  });
});
