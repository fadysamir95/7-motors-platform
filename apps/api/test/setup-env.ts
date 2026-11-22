import { randomBytes } from 'crypto';

// Integration tests must never touch the development database.
const TEST_DB_URL = 'postgresql://motors:motors@localhost:5435/motors_test?schema=public';

const url = process.env.TEST_DATABASE_URL || TEST_DB_URL;
if (!new URL(url).pathname.endsWith('_test')) {
  throw new Error('Refusing to run e2e tests: the database name must end with "_test".');
}
process.env.DATABASE_URL = url;
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.NODE_ENV = 'test';
