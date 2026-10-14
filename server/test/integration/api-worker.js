import mongoose from 'mongoose';
import { createApp } from '../../dist/app.js';
import { defaultPolicy } from '../../dist/booking/scheduling.js';

if (!/^studio_north_test_[a-f0-9]{16}$/.test(process.env.MONGODB_TEST_DB ?? '')) process.exit(1);
try {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_TEST_DB, serverSelectionTimeoutMS: 5000 });
  const server = createApp({ ...defaultPolicy, rateLimitMax: 100 }).listen(0, '127.0.0.1', () => {
    const address = server.address();
    if (address && typeof address === 'object') process.send?.({ port: address.port });
  });
  process.on('message', () => {
    server.close(() => { void mongoose.disconnect().then(() => process.exit(0)); });
    server.closeIdleConnections();
  });
} catch { process.send?.({ error: 'Integration worker connection failed' }); process.exit(1); }
