import mongoose from 'mongoose';
import { parseEnv } from './env.js';
import { ensureBookingIndexes } from './booking/models.js';
import { designateDemo, resetDemo } from './admin/demo.js';
try {
  const env = parseEnv(process.env);
  if (!env.DEMO_MODE || process.env.DEMO_RESET_CONFIRM !== 'RESET DEMO')
    throw new Error('Demo reset not explicitly authorized');
  await mongoose.connect(env.MONGODB_URI, {
    dbName: env.DEMO_DATABASE!,
    serverSelectionTimeoutMS: 5000,
  });
  await ensureBookingIndexes();
  await designateDemo();
  await resetDemo(env.BUSINESS_TIMEZONE);
  console.info(
    'Designated demo catalog/schedules and synthetic appointments reset.',
  );
} catch {
  console.error(
    'Demo reset refused or failed. Require a designated demo database and explicit confirmation.',
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
