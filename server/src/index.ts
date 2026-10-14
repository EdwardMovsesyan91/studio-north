import type { Server } from 'node:http';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { parseEnv } from './env.js';
import { BookingState, ensureBookingIndexes } from './booking/models.js';
import { ensureAdminIndexes } from './admin/models.js';
import { assertDemoDatabase } from './admin/demo.js';

let server: Server | undefined;
let stopping = false;

async function shutdown(exitCode: number) {
  if (stopping) return;
  stopping = true;
  const deadline = setTimeout(() => process.exit(1), 10_000);
  deadline.unref();
  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => (error ? reject(error) : resolve()));
        server?.closeIdleConnections();
      });
    }
    await mongoose.disconnect();
    process.exitCode = exitCode;
  } catch {
    console.error('Shutdown failed');
    process.exitCode = 1;
  } finally {
    clearTimeout(deadline);
  }
}

process.on('SIGINT', () => {
  void shutdown(0);
});
process.on('SIGTERM', () => {
  void shutdown(0);
});
mongoose.connection.on('error', () =>
  console.error('MongoDB connection error'),
);
mongoose.connection.on('disconnected', () =>
  console.warn('MongoDB disconnected'),
);

async function start() {
  const env = parseEnv(process.env);
  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      ...(env.DEMO_MODE ? { dbName: env.DEMO_DATABASE! } : {}),
    });
  } catch {
    throw new Error(
      'MongoDB startup connection failed. Check MONGODB_URI and database availability.',
    );
  }
  if (stopping) {
    await mongoose.disconnect();
    return;
  }
  try {
    const hello = await mongoose.connection.db!.admin().command({ hello: 1 });
    if (!hello.setName && hello.msg !== 'isdbgrid')
      throw new Error('Unsupported deployment');
    await ensureBookingIndexes();
    await ensureAdminIndexes();
  } catch {
    throw new Error(
      'Booking startup requires a replica-set-compatible MongoDB and valid booking indexes.',
    );
  }
  if (env.DEMO_MODE) {
    assertDemoDatabase();
    const state = await BookingState.findById('booking').lean();
    if (!state?.demoDesignated)
      throw new Error(
        'Demo database is not initialized. Run the guarded demo:reset operator command before starting demo mode.',
      );
  }
  const app = createApp(
    {
      timezone: env.BUSINESS_TIMEZONE,
      leadMinutes: env.BOOKING_LEAD_MINUTES,
      horizonDays: env.BOOKING_HORIZON_DAYS,
      rateLimitMax: env.BOOKING_RATE_LIMIT_MAX,
    },
    {
      origin: env.CLIENT_ORIGIN,
      secureCookies: env.SESSION_COOKIE_SECURE,
      sessionMinutes: env.SESSION_MINUTES,
      demoMode: env.DEMO_MODE,
    },
  );
  await new Promise<void>((resolve, reject) => {
    server = app.listen(env.PORT, () => resolve());
    server.once('error', reject);
  });
  server?.on('error', () => {
    console.error('HTTP server error');
    void shutdown(1);
  });
  console.info(`Studio North API listening on port ${env.PORT}`);
}

start().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Startup failed');
  void shutdown(1);
});
