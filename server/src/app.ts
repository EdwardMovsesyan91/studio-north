import express from 'express';
import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { bookingRouter } from './booking/routes.js';
import { ApiError } from './booking/errors.js';
import type { BookingPolicy } from './booking/scheduling.js';
import { defaultPolicy } from './booking/scheduling.js';
import { adminRouter } from './admin/routes.js';
import { defaultAdminOptions } from './admin/auth.js';
import type { AdminOptions } from './admin/auth.js';

export function createApp(policy: BookingPolicy = defaultPolicy, admin: AdminOptions = defaultAdminOptions) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (_req, res) => {
    const state = mongoose.connection.readyState;
    const database = ['disconnected', 'connected', 'connecting', 'disconnecting'][state] ?? 'unknown';
    const healthy = state === 1;
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      service: 'studio-north-api',
      timestamp: new Date().toISOString(),
      database: { status: database, connected: healthy },
    });
  });

  app.use('/api/admin', adminRouter(admin, policy));
  app.use('/api', bookingRouter(policy, admin.demoMode));
  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
    if (res.headersSent) { next(error); return; }
    if (error instanceof ApiError) {
      if (error.status === 429) res.set('Retry-After', '900');
      res.status(error.status).json({ error: { code: error.code, message: error.message } });
      return;
    }
    const malformedJson = error instanceof SyntaxError && 'type' in error && error.type === 'entity.parse.failed';
    const tooLarge = typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large';
    const status = malformedJson ? 400 : tooLarge ? 413 : 500;
    if (status === 500) console.error('Unhandled request error');
    res.status(status).json({ error: {
      code: malformedJson ? 'INVALID_JSON' : tooLarge ? 'PAYLOAD_TOO_LARGE' : 'INTERNAL_ERROR',
      message: malformedJson ? 'Invalid JSON body' : tooLarge ? 'Request body too large' : 'Internal server error',
    } });
  };
  app.use(errorHandler);
  return app;
}
