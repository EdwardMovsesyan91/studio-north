import mongoose from 'mongoose';
import { parseEnv } from './env.js';
import { ensureBookingIndexes } from './booking/models.js';
import { seedDevelopment } from './booking/seed.js';

try {
  if (process.env.NODE_ENV === 'production') throw new Error('Development seed is disabled in production');
  const env = parseEnv(process.env);
  if (env.DEMO_MODE) throw new Error('Use the guarded demo:reset command in demo mode');
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await ensureBookingIndexes();
  await seedDevelopment(env.BUSINESS_TIMEZONE);
  console.info('Fictional development catalog and schedules seeded. Existing records preserved.');
} catch {
  console.error('Development seed failed. Check configuration, connectivity and indexes; use demo:reset in demo mode. No reset was performed.');
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
