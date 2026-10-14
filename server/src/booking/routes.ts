import { createHash } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { Appointment, Barber, BookingRateLimit, Service, WorkingSchedule } from './models.js';
import { ApiError, isDuplicateKey } from './errors.js';
import { createAppointment, getAvailability, publicAppointment } from './service.js';
import { defaultPolicy } from './scheduling.js';
import type { BookingPolicy } from './scheduling.js';

const id = z.string().max(80).regex(/^[a-z0-9-]+$/);
const barberId = id.default('any');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const stamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === value;
});
const availabilityQuery = z.strictObject({ serviceId: id, barberId, date });
const bookingBody = z.strictObject({
  serviceId: id, barberId,
  startsAt: z.iso.datetime().refine((value) => Date.parse(value) % 900000 === 0, 'Must start on a 15-minute UTC boundary'),
  customer: z.strictObject({
    name: z.string().trim().max(200).transform((value) => value.normalize('NFC')).pipe(z.string().min(2).max(100).regex(/^\P{Cc}+$/u)),
    email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
    phone: z.string().trim().max(30).transform((value) => value.replace(/[\s()-]/g, '')).pipe(z.string().regex(/^\+?\d{7,15}$/)).optional(),
  }),
});
function validate<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new ApiError(400, 'INVALID_REQUEST', 'Request fields are missing, invalid or unsupported');
  return result.data;
}

export async function limitBooking(ip: string, max: number) {
  const windowMs = 15 * 60 * 1000;
  const window = Math.floor(Date.now() / windowMs);
  const _id = createHash('sha256').update(`${ip}:${window}`).digest('hex');
  const expiresAt = new Date((window + 1) * windowMs);
  let counter;
  try {
    counter = await BookingRateLimit.findOneAndUpdate({ _id }, { $inc: { count: 1 }, $setOnInsert: { expiresAt } }, { upsert: true, returnDocument: 'after' });
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    counter = await BookingRateLimit.findOneAndUpdate({ _id }, { $inc: { count: 1 } }, { returnDocument: 'after' });
  }
  if (!counter || counter.count > max) throw new ApiError(429, 'RATE_LIMITED', 'Too many booking attempts. Try again later.');
}

export function bookingRouter(policy: BookingPolicy = defaultPolicy, demoMode = false) {
  const router = Router();
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  router.get('/business', async (_req, res) => {
    const schedule = await WorkingSchedule.findById('business').lean();
    if (!schedule) throw new ApiError(503, 'SCHEDULE_UNAVAILABLE', 'Business hours are unavailable');
    res.json({ timezone: policy.timezone, currency: 'USD', hours: schedule.hours, demoMode, leadMinutes: policy.leadMinutes, horizonDays: policy.horizonDays });
  });
  router.get('/services', async (_req, res) => {
    const services = await Service.find({ isActive: true }).sort({ displayOrder: 1, _id: 1 }).lean();
    res.json({ fictionalDemo: true, currency: 'USD', services: services.map(({ _id, name, slug, description, durationMinutes, priceCents, isActive, displayOrder }) => ({ id: _id, name, slug, description, durationMinutes, priceCents, isActive, displayOrder })) });
  });
  router.get('/barbers', async (_req, res) => {
    const barbers = await Barber.find({ isActive: true }).sort({ _id: 1 }).lean();
    res.json({ fictionalDemo: true, barbers: barbers.map(({ _id, name, slug, title, biography, specialty, portrait, supportedServiceIds, isActive }) => ({ id: _id, name, slug, title, biography, specialty, portrait, supportedServiceIds, isActive })) });
  });
  router.get('/availability', async (req, res) => {
    const query = validate(availabilityQuery, req.query);
    res.json(await getAvailability(query.serviceId, query.barberId, query.date, policy));
  });
  router.post('/appointments', async (req, res) => {
    const input = validate(bookingBody, req.body);
    await limitBooking(req.ip ?? req.socket.remoteAddress ?? 'unknown', policy.rateLimitMax);
    if (demoMode) input.customer = { name: 'Demo Visitor', email: 'visitor@studio-north.invalid' };
    const key = req.get('Idempotency-Key');
    if (key) validate(z.uuid(), key);
    const appointment = await createAppointment(input, policy, key);
    res.status(201).json({ appointment, timezone: policy.timezone });
  });
  router.get('/appointments/:reference', async (req, res) => {
    const reference = validate(z.string().regex(/^[A-Za-z0-9_-]{32}$/), req.params.reference);
    const appointment = await Appointment.findOne({ reference }).lean();
    if (!appointment) throw new ApiError(404, 'APPOINTMENT_NOT_FOUND', 'Appointment not found');
    // Explicit allowlist excludes name, email, phone, internal IDs and timestamps.
    res.json({ appointment: publicAppointment(appointment), timezone: policy.timezone });
  });
  return router;
}
