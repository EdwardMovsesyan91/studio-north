import mongoose from 'mongoose';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { parseEnv } from './env.js';
import { AdminUser, ensureAdminIndexes } from './admin/models.js';
try {
  const env = parseEnv(process.env);
  const email = z.email().parse(process.env.ADMIN_EMAIL).toLowerCase();
  const password = z
    .string()
    .min(12)
    .max(72)
    .refine((value) => Buffer.byteLength(value) <= 72)
    .parse(process.env.ADMIN_INITIAL_PASSWORD);
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    ...(env.DEMO_MODE ? { dbName: env.DEMO_DATABASE! } : {}),
  });
  await ensureAdminIndexes();
  await AdminUser.updateOne(
    { _id: 'administrator' },
    { $setOnInsert: { email, passwordHash: await hash(password, 12) } },
    { upsert: true },
  );
  console.info(
    'Administrator initialized if absent. Existing credentials preserved.',
  );
} catch {
  console.error(
    'Admin setup failed. Supply valid runtime ADMIN_EMAIL/ADMIN_INITIAL_PASSWORD and database configuration.',
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
