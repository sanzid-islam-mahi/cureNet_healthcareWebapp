/**
 * Mark existing users as email-verified.
 *
 * Run from backend:
 *   npm run verify-existing-users
 *
 * Optional:
 *   VERIFY_ONLY_ACTIVE=true npm run verify-existing-users
 */

import db from '../src/models/index.js';

const { User } = db;

async function main() {
  const verifyOnlyActive = process.env.VERIFY_ONLY_ACTIVE === 'true';
  const now = new Date();

  try {
    await db.sequelize.authenticate();

    const where = {
      emailVerifiedAt: null,
      ...(verifyOnlyActive ? { isActive: true } : {}),
    };

    const [updatedCount] = await User.update(
      { emailVerifiedAt: now },
      { where },
    );

    console.log(`Marked ${updatedCount} user(s) as email-verified at ${now.toISOString()}`);
  } catch (err) {
    console.error('Error verifying existing users:', err.message);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

main();
