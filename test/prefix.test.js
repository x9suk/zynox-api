const { handlePrefixOwnerCommand } = require('../src/bot/owner/prefixHandler');

jest.mock('../src/config/env', () => ({
  bot: {
    ownerIds: ['111111111111111111', '222222222222222222'],
    prefix: ';',
  },
  redis: { prefix: 'zynox:' },
}));

const handlerFns = {};
jest.mock('../src/bot/owner/ownerHandlers', () => {
  const mockReply = jest.fn();
  return {
    handleStats: jest.fn(() => mockReply),
    handleHealth: jest.fn(() => mockReply),
    handleDevs: jest.fn(() => mockReply),
    handleBan: jest.fn(() => mockReply),
    handleUnban: jest.fn(() => mockReply),
    handlePlan: jest.fn(() => mockReply),
    handleCache: jest.fn(() => mockReply),
    handleMaintenance: jest.fn(() => mockReply),
    handleLogs: jest.fn(() => mockReply),
    handleReload: jest.fn(() => mockReply),
  };
});

function makeMessage(content, authorId = '111111111111111111') {
  return {
    content,
    author: { id: authorId, bot: false },
    client: {},
    channel: { send: jest.fn() },
    guild: { id: '123' },
    reply: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('; prefix — owner routing', () => {
  it('routes ;stats to handleStats', async () => {
    const msg = makeMessage(';stats');
    await handlePrefixOwnerCommand(msg);
    const { handleStats } = require('../src/bot/owner/ownerHandlers');
    expect(handleStats).toHaveBeenCalledTimes(1);
  });

  it('routes ;health to handleHealth', async () => {
    const msg = makeMessage(';health');
    await handlePrefixOwnerCommand(msg);
    const { handleHealth } = require('../src/bot/owner/ownerHandlers');
    expect(handleHealth).toHaveBeenCalledTimes(1);
  });

  it('routes ;devs to handleDevs with page param', async () => {
    const msg = makeMessage(';devs 2');
    let ctx;
    const { handleDevs } = require('../src/bot/owner/ownerHandlers');
    handleDevs.mockImplementationOnce((c) => { ctx = c; });
    await handlePrefixOwnerCommand(msg);
    expect(ctx.options.getInteger('page')).toBe(2);
  });

  it('routes ;ban with discordId and reason', async () => {
    const msg = makeMessage(';ban 333333333333333333 spam');
    let ctx;
    const { handleBan } = require('../src/bot/owner/ownerHandlers');
    handleBan.mockImplementationOnce((c) => { ctx = c; });
    await handlePrefixOwnerCommand(msg);
    expect(ctx.options.getString('user')).toBe('333333333333333333');
    expect(ctx.options.getString('reason')).toBe('spam');
  });

  it('routes ;unban with discordId', async () => {
    const msg = makeMessage(';unban 333333333333333333');
    let ctx;
    const { handleUnban } = require('../src/bot/owner/ownerHandlers');
    handleUnban.mockImplementationOnce((c) => { ctx = c; });
    await handlePrefixOwnerCommand(msg);
    expect(ctx.options.getString('user')).toBe('333333333333333333');
  });

  it('routes ;plan with discordId and plan', async () => {
    const msg = makeMessage(';plan 333333333333333333 pro');
    let ctx;
    const { handlePlan } = require('../src/bot/owner/ownerHandlers');
    handlePlan.mockImplementationOnce((c) => { ctx = c; });
    await handlePrefixOwnerCommand(msg);
    expect(ctx.options.getString('user')).toBe('333333333333333333');
    expect(ctx.options.getString('plan')).toBe('pro');
  });

  it('routes ;cache stats', async () => {
    const msg = makeMessage(';cache stats');
    let ctx;
    const { handleCache } = require('../src/bot/owner/ownerHandlers');
    handleCache.mockImplementationOnce((c) => { ctx = c; });
    await handlePrefixOwnerCommand(msg);
    expect(ctx.options.getString('action')).toBe('stats');
  });

  it('routes ;cache flush presence', async () => {
    const msg = makeMessage(';cache flush presence');
    let ctx;
    const { handleCache } = require('../src/bot/owner/ownerHandlers');
    handleCache.mockImplementationOnce((c) => { ctx = c; });
    await handlePrefixOwnerCommand(msg);
    expect(ctx.options.getString('action')).toBe('flush');
    expect(ctx.options.getString('group')).toBe('presence');
  });

  it('routes ;cache flush all', async () => {
    const msg = makeMessage(';cache flush all');
    let ctx;
    const { handleCache } = require('../src/bot/owner/ownerHandlers');
    handleCache.mockImplementationOnce((c) => { ctx = c; });
    await handlePrefixOwnerCommand(msg);
    expect(ctx.options.getString('action')).toBe('flush');
    expect(ctx.options.getString('group')).toBe('all');
  });

  it('routes ;maintenance on', async () => {
    const msg = makeMessage(';maintenance on');
    let ctx;
    const { handleMaintenance } = require('../src/bot/owner/ownerHandlers');
    handleMaintenance.mockImplementationOnce((c) => { ctx = c; });
    await handlePrefixOwnerCommand(msg);
    expect(ctx.options.getString('action')).toBe('on');
  });

  it('routes ;maintenance off', async () => {
    const msg = makeMessage(';maintenance off');
    let ctx;
    const { handleMaintenance } = require('../src/bot/owner/ownerHandlers');
    handleMaintenance.mockImplementationOnce((c) => { ctx = c; });
    await handlePrefixOwnerCommand(msg);
    expect(ctx.options.getString('action')).toBe('off');
  });

  it('routes ;logs', async () => {
    const msg = makeMessage(';logs');
    await handlePrefixOwnerCommand(msg);
    const { handleLogs } = require('../src/bot/owner/ownerHandlers');
    expect(handleLogs).toHaveBeenCalledTimes(1);
  });

  it('routes ;reload', async () => {
    const msg = makeMessage(';reload');
    await handlePrefixOwnerCommand(msg);
    const { handleReload } = require('../src/bot/owner/ownerHandlers');
    expect(handleReload).toHaveBeenCalledTimes(1);
  });

  it('ignores message without correct prefix', async () => {
    const msg = makeMessage('!stats');
    await handlePrefixOwnerCommand(msg);
    const { handleStats } = require('../src/bot/owner/ownerHandlers');
    expect(handleStats).not.toHaveBeenCalled();
  });

  it('ignores unknown command', async () => {
    const msg = makeMessage(';unknown');
    await handlePrefixOwnerCommand(msg);
    const { handleStats } = require('../src/bot/owner/ownerHandlers');
    expect(handleStats).not.toHaveBeenCalled();
  });

  it('rejects non-owner users', async () => {
    const msg = makeMessage(';stats', '999999999999999999');
    await handlePrefixOwnerCommand(msg);
    const { handleStats } = require('../src/bot/owner/ownerHandlers');
    expect(handleStats).not.toHaveBeenCalled();
  });

  it('provides reply function that sends to channel', async () => {
    const msg = makeMessage(';stats');
    let ctx;
    const { handleStats } = require('../src/bot/owner/ownerHandlers');
    handleStats.mockImplementationOnce((c) => { ctx = c; });
    await handlePrefixOwnerCommand(msg);
    await ctx.reply({ content: 'hello' });
    expect(msg.channel.send).toHaveBeenCalledWith({ content: 'hello' });
  });
});
