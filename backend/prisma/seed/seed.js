'use strict';
/**
 * Production seed — runs with plain `node`, no TypeScript toolchain needed.
 * Uses @prisma/client (generated into node_modules at build time via `npx prisma generate`).
 *
 * Usage:  node prisma/seed/seed.js
 * Called by: npx prisma db seed  (via package.json "prisma.seed" field)
 *
 * Seeds password-based users so the printed SEED_CRED values can log in via
 * POST /api/auth/login. Passwords are bcrypt-hashed to match auth.service.
 */
const { PrismaClient } = require('@prisma/client');
const { createHash } = require('crypto');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function derivePassword(email) {
  return createHash('sha256')
    .update(email + (process.env.SEED_SECRET || 'colossus-seed'))
    .digest('hex')
    .slice(0, 16);
}

const SEED_USERS = [
  { email: 'admin@example.com', name: 'Admin User', role: 'ADMIN' },
  { email: 'user@example.com', name: 'Regular User', role: 'USER' },
];

async function main() {
  for (const u of SEED_USERS) {
    const password = derivePassword(u.email);
    const hash = bcrypt.hashSync(password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, password: hash },
      create: { email: u.email, name: u.name, role: u.role, password: hash },
    });
    console.log(`SEED_CRED ${u.role} ${u.email} ${password}`);
  }
}

main()
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
