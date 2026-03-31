/**
 * Create the first admin user. Password is hashed via User model's beforeCreate hook.
 * Run from backend: node scripts/create-admin.mjs
 * Or with env: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret npm run create-admin
 *
 * Options:
 * - Set ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FIRST_NAME, ADMIN_LAST_NAME in .env
 * - Or pass as args: node scripts/create-admin.mjs admin@example.com secret "Admin" "User"
 */

import db from '../src/models/index.js';

const { User } = db;

async function main() {
  const email = process.env.ADMIN_EMAIL || process.argv[2];
  const password = process.env.ADMIN_PASSWORD || process.argv[3];
  const firstName = process.env.ADMIN_FIRST_NAME || process.argv[4] || 'Admin';
  const lastName = process.env.ADMIN_LAST_NAME || process.argv[5] || 'User';

  if (!email || !password) {
    console.error('Usage: ADMIN_EMAIL=x ADMIN_PASSWORD=y node scripts/create-admin.mjs');
    console.error('   or: node scripts/create-admin.mjs <email> <password> [firstName] [lastName]');
    process.exit(1);
  }

  try {
    await db.sequelize.authenticate();

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      if (existing.role === 'admin') {
        console.log('Admin with this email already exists. To change password, use update-admin-password.mjs');
        process.exit(0);
      }
      console.error('A non-admin user exists with this email. Choose a different email.');
      process.exit(1);
    }

    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: 'admin',
      isActive: true,
      emailVerifiedAt: new Date(),
    });

    console.log('Admin created:', user.email, '(id:', user.id, ')');
    console.log('You can now log in at the website.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await db.sequelize.close();
  }
}

main();
