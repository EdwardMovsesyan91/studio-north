import { Router } from 'express';
import { z } from 'zod';
import {
  Appointment,
  Barber,
  BookingState,
  Service,
  WorkingSchedule,
} from '../booking/models.js';
import { changeAppointmentStatus } from '../booking/service.js';
import { dateInstants } from '../booking/scheduling.js';
import type { BookingPolicy } from '../booking/scheduling.js';
import {
  checkOrigin,
  login,
  logout,
  requireSession,
  startSession,
} from './auth.js';
import type { AdminOptions } from './auth.js';
import { assertDemoDatabase, resetDemo } from './demo.js';
import {
  barberInput,
  saveBarber,
  saveSchedule,
  saveService,
  scheduleInput,
  serviceInput,
  validated,
} from './management.js';
import { ApiError } from '../booking/errors.js';
import { limitBooking } from '../booking/routes.js';

export function adminRouter(options: AdminOptions, policy: BookingPolicy) {
  const router = Router();
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.post('/login', async (req, res) => {
    checkOrigin(req, options);
    const input = validated(
      z.strictObject({
        email: z.email().transform((value) => value.toLowerCase()),
        password: z
          .string()
          .min(1)
          .max(72)
          .refine((value) => Buffer.byteLength(value) <= 72),
      }),
      req.body,
    );
    await login(req, input.email, input.password);
    res.json(await startSession(req, res, 'owner', options));
  });
  router.post('/demo-login', async (req, res) => {
    checkOrigin(req, options);
    validated(z.strictObject({}), req.body);
    if (!options.demoMode)
      throw new ApiError(
        403,
        'DEMO_DISABLED',
        'Demo administration is disabled',
      );
    assertDemoDatabase();
    if (!(await BookingState.findById('booking').lean())?.demoDesignated)
      throw new ApiError(
        403,
        'DEMO_RESTRICTED',
        'Demo database is not initialized',
      );
    await limitBooking(`demo-login:${req.ip ?? 'unknown'}`, 10);
    res.json(await startSession(req, res, 'demo', options));
  });
  router.use(async (req, res, next) => {
    res.locals.adminSession = await requireSession(req, options);
    next();
  });
  router.get('/session', async (req, res) => {
    const session = await requireSession(req, options);
    res.json({
      authenticated: true,
      scope: session.scope,
      csrf: session.csrf,
      expiresAt: session.expiresAt.toISOString(),
    });
  });
  router.post('/logout', async (req, res) => {
    await logout(req, res, options);
    res.json({ authenticated: false });
  });
  router.get('/overview', async (_req, res) => {
    const rows = await Appointment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$priceCentsSnapshot' },
        },
      },
    ]);
    const counts = Object.fromEntries(rows.map((row) => [row._id, row.count]));
    const upcoming = await Appointment.find({
      status: { $in: ['pending', 'confirmed'] },
      startsAt: { $gte: new Date() },
    })
      .sort({ startsAt: 1 })
      .limit(5)
      .lean();
    res.json({
      counts: {
        pending: counts.pending ?? 0,
        confirmed: counts.confirmed ?? 0,
        completed: counts.completed ?? 0,
        cancelled: counts.cancelled ?? 0,
      },
      revenueCents: rows.find((row) => row._id === 'completed')?.revenue ?? 0,
      upcoming,
      fictionalDemo: true,
    });
  });
  router.get('/appointments', async (req, res) => {
    const query = validated(
      z.strictObject({
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        status: z
          .enum(['pending', 'confirmed', 'cancelled', 'completed'])
          .optional(),
      }),
      req.query,
    );
    const instants = query.date
      ? dateInstants(query.date, policy.timezone)
      : [];
    if (query.date && !instants.length)
      throw new ApiError(400, 'INVALID_REQUEST', 'Date is invalid');
    const filter = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.date
        ? {
            startsAt: {
              $gte: instants[0]!,
              $lt: new Date(instants.at(-1)!.getTime() + 900000),
            },
          }
        : {}),
    };
    const appointments = await Appointment.find(filter)
      .sort({ startsAt: -1 })
      .limit(200)
      .lean();
    res.json({ appointments, timezone: policy.timezone, limit: 200 });
  });
  router.post('/appointments/:reference/status', async (req, res) => {
    const input = validated(
      z.strictObject({
        status: z.enum(['confirmed', 'cancelled', 'completed']),
      }),
      req.body,
    );
    const reference = validated(
      z.string().regex(/^[A-Za-z0-9_-]{32}$/),
      req.params.reference,
    );
    res.json({
      appointment: await changeAppointmentStatus(reference, input.status),
    });
  });
  router.get('/services', async (_req, res) => {
    res.json({
      services: await Service.find().sort({ displayOrder: 1 }).lean(),
    });
  });
  router.post('/services', async (req, res) => {
    const input = validated(serviceInput, req.body);
    res
      .status(201)
      .json({ service: await saveService(input.slug, input, true) });
  });
  router.put('/services/:id', async (req, res) => {
    const id = validated(z.string().regex(/^[a-z0-9-]{1,80}$/), req.params.id);
    res.json({
      service: await saveService(id, validated(serviceInput, req.body)),
    });
  });
  router.get('/barbers', async (_req, res) => {
    res.json({ barbers: await Barber.find().sort({ _id: 1 }).lean() });
  });
  router.put('/barbers/:id', async (req, res) => {
    const id = validated(z.string().regex(/^[a-z0-9-]{1,80}$/), req.params.id);
    res.json({
      barber: await saveBarber(id, validated(barberInput, req.body)),
    });
  });
  router.get('/schedules', async (_req, res) => {
    res.json({ schedules: await WorkingSchedule.find().lean() });
  });
  router.put('/schedules/:barberId', async (req, res) => {
    const id = validated(
      z.string().regex(/^[a-z0-9-]{1,80}$/),
      req.params.barberId,
    );
    res.json({
      schedule: await saveSchedule(
        id,
        validated(scheduleInput, req.body),
        policy,
      ),
    });
  });
  router.post('/reset', async (req, res) => {
    validated(
      z.strictObject({ confirmation: z.literal('RESET DEMO') }),
      req.body,
    );
    if (!options.demoMode)
      throw new ApiError(
        403,
        'DEMO_DISABLED',
        'Reset is restricted to designated demo data',
      );
    await limitBooking(`demo-reset:${req.ip ?? 'unknown'}`, 3);
    res.json(await resetDemo(policy.timezone));
  });
  return router;
}
