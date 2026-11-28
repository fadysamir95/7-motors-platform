/**
 * Sets a new password for a staff account (default: the seeded admin, admin@7motors.com).
 *
 *   cd apps/api
 *   npx ts-node prisma/reset-admin-password.ts                      # generates a strong password and prints it once
 *   ADMIN_NEW_PASSWORD='your-own-password' npx ts-node prisma/reset-admin-password.ts
 *   ADMIN_EMAIL='someone@example.com' npx ts-node prisma/reset-admin-password.ts
 *
 * Run it yourself on the machine that owns the database. The account must already exist and hold a staff role.
 * The password is never stored anywhere except as a bcrypt hash.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();
const STAFF = ['SUPER_ADMIN', 'ADMIN', 'SERVICE_MANAGER', 'INVENTORY_MANAGER', 'ORDER_MANAGER', 'MARKETPLACE_MODERATOR', 'WHOLESALE_MANAGER'];

async function main() {
  const email = process.env.ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL || 'admin@7motors.com';
  const supplied = process.env.ADMIN_NEW_PASSWORD;
  if (supplied !== undefined && (supplied.length < 12 || supplied.length > 72)) throw new Error('ADMIN_NEW_PASSWORD must be 12 to 72 characters long.');
  const password = supplied ?? randomBytes(15).toString('base64url');

  const user = await prisma.user.findUnique({ where: { email }, include: { roles: { include: { role: true } } } });
  if (!user) throw new Error(`No account with the e-mail ${email}.`);
  if (!user.roles.some((r) => STAFF.includes(r.role.name))) throw new Error(`${email} is not a staff account; refusing to change it.`);

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 12), isActive: true } });
  await prisma.auditLog.create({ data: { userId: user.id, action: 'auth.password_reset', entityType: 'User', entityId: user.id, metadata: { by: 'reset-admin-password script' } } });

  console.log(`Password updated for ${email}.`);
  if (supplied === undefined) console.log(`New password (shown once, store it in a password manager): ${password}`);
}

main()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); })
  .finally(() => prisma.$disconnect());
