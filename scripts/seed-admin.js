/**
 * Seed the first admin developer account.
 *
 * Usage:
 *   ADMIN_DISCORD_ID=123456789012345678 node scripts/seed-admin.js
 *
 * This creates a developer with role=superadmin and plan=enterprise
 * if one doesn't already exist for the given Discord ID.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { Developer, Subscription } = require('../src/models');
const logger = require('../src/utils/logger');

const discordId = process.env.ADMIN_DISCORD_ID;
if (!discordId) {
  console.error('Usage: ADMIN_DISCORD_ID=123456789012345678 node scripts/seed-admin.js');
  console.error('Set ADMIN_DISCORD_ID environment variable to your Discord user ID.');
  process.exit(1);
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  logger.info('Connected to MongoDB');

  let dev = await Developer.findOne({ discordId });
  if (dev) {
    logger.info({ discordId, currentRole: dev.role, currentPlan: dev.plan }, 'Developer already exists');
    dev.role = 'superadmin';
    dev.plan = 'enterprise';
    dev.isBanned = false;
    await dev.save();
    logger.info({ discordId }, 'Developer upgraded to superadmin/enterprise');
  } else {
    dev = await Developer.create({
      discordId,
      username: 'admin',
      globalName: 'Admin',
      role: 'superadmin',
      plan: 'enterprise',
      isBanned: false,
    });
    logger.info({ discordId }, 'Developer created as superadmin/enterprise');
  }

  const existingSub = await Subscription.findOne({ developer: dev._id, status: 'active' });
  if (!existingSub) {
    await Subscription.createFromPlan(dev._id, 'enterprise', 'manual');
    logger.info({ discordId }, 'Enterprise subscription created');
  }

  await mongoose.disconnect();
  logger.info('Seed complete');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
