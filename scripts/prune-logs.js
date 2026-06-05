/**
 * Prune old log data from MongoDB.
 *
 * Removes PresenceLog, BotStats, and GuildStats records
 * older than the specified number of days.
 *
 * Usage:
 *   node scripts/prune-logs.js [days] [--dry-run]
 *
 * Default: prune records older than 90 days
 * --dry-run: count records without deleting
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const args = process.argv.slice(2);
const days = parseInt(args.find((a) => /^\d+$/.test(a)), 10) || 90;
const dryRun = args.includes('--dry-run');

const { PresenceLog, BotStats, GuildStats } = require('../src/models');

async function prune() {
  await mongoose.connect(process.env.MONGODB_URI);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  console.log(`Pruning records older than ${days} days (before ${cutoff.toISOString()})${dryRun ? ' [DRY RUN]' : ''}`);

  const collections = [
    { name: 'PresenceLog', model: PresenceLog },
    { name: 'BotStats', model: BotStats },
    { name: 'GuildStats', model: GuildStats },
  ];

  for (const { name, model } of collections) {
    const count = await model.countDocuments({ createdAt: { $lt: cutoff } });
    console.log(`${name}: ${count} records to prune`);

    if (!dryRun && count > 0) {
      await model.deleteMany({ createdAt: { $lt: cutoff } });
      console.log(`  → Deleted ${count} records`);
    }
  }

  await mongoose.disconnect();
  console.log('Prune complete');
}

prune().catch((err) => {
  console.error('Prune failed:', err);
  process.exit(1);
});
