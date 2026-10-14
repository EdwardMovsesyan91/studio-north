import mongoose from 'mongoose';
import { z } from 'zod';
import {
  Appointment,
  Barber,
  Service,
  WorkingSchedule,
} from '../booking/models.js';
import { ApiError } from '../booking/errors.js';
import { enterBookingTransaction } from '../booking/gate.js';
import { canBook, defaultPolicy } from '../booking/scheduling.js';
import type { BookingPolicy } from '../booking/scheduling.js';

const id = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/);
const text = (max: number) => z.string().trim().min(1).max(max);
export const serviceInput = z.strictObject({
  name: text(100),
  slug: id,
  description: text(1000),
  durationMinutes: z.number().int().min(15).max(480).multipleOf(15),
  priceCents: z.number().int().min(0).max(1000000),
  isActive: z.boolean(),
  displayOrder: z.number().int().min(0).max(10000),
});
export const barberInput = z.strictObject({
  name: text(100),
  slug: id,
  title: text(100),
  biography: text(2000),
  specialty: text(200),
  portrait: z
    .enum([
      '/images/portrait-verfe-800.webp',
      '/images/portrait-rdne-800.webp',
      '/images/portrait-cottonbro-800.webp',
    ])
    .nullable(),
  supportedServiceIds: z
    .array(id)
    .min(1)
    .max(100)
    .refine((ids) => new Set(ids).size === ids.length),
  isActive: z.boolean(),
});
const period = z
  .strictObject({
    opens: z.number().int().min(0).max(1439),
    closes: z.number().int().min(1).max(1440),
  })
  .refine((value) => value.opens < value.closes);
export const scheduleInput = z.strictObject({
  timezone: z.literal('America/Los_Angeles'),
  hours: z
    .array(
      z.strictObject({
        day: z.number().int().min(0).max(6),
        periods: z.array(period).max(4),
      }),
    )
    .length(7)
    .refine(
      (hours) =>
        new Set(hours.map((day) => day.day)).size === 7 &&
        hours.every((day) =>
          day.periods.every((p, i) =>
            day.periods.every(
              (q, j) => i === j || p.closes <= q.opens || p.opens >= q.closes,
            ),
          ),
        ),
    ),
  timeOff: z
    .array(
      z
        .strictObject({ startsAt: z.iso.datetime(), endsAt: z.iso.datetime() })
        .refine(
          (value) => Date.parse(value.startsAt) < Date.parse(value.endsAt),
        ),
    )
    .max(100),
});
export function validated<T>(schema: z.ZodType<T>, input: unknown) {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new ApiError(
      400,
      'INVALID_REQUEST',
      'Fields are invalid, missing or unsupported',
    );
  return result.data;
}

export async function saveService(
  id: string,
  input: z.infer<typeof serviceInput>,
  create = false,
) {
  return mongoose.connection.transaction(async (session) => {
    await enterBookingTransaction(session);
    if (
      (await Service.exists({ slug: input.slug, _id: { $ne: id } }).session(
        session,
      )) ||
      (create && (await Service.exists({ _id: id }).session(session)))
    )
      throw new ApiError(
        409,
        'CATALOG_CONFLICT',
        'Service ID or slug already exists',
      );
    const service = create
      ? new Service({ _id: id, ...input })
      : await Service.findById(id).session(session);
    if (!service)
      throw new ApiError(404, 'SERVICE_NOT_FOUND', 'Service not found');
    service.set(input);
    await service.save({ session });
    return service;
  });
}
export async function saveBarber(
  id: string,
  input: z.infer<typeof barberInput>,
) {
  return mongoose.connection.transaction(async (session) => {
    await enterBookingTransaction(session);
    if (
      await Barber.exists({ slug: input.slug, _id: { $ne: id } }).session(
        session,
      )
    )
      throw new ApiError(409, 'CATALOG_CONFLICT', 'Barber slug already exists');
    const barber = await Barber.findById(id).session(session);
    if (!barber)
      throw new ApiError(404, 'BARBER_NOT_FOUND', 'Barber not found');
    if (
      (await Service.countDocuments({
        _id: { $in: input.supportedServiceIds },
      }).session(session)) !== input.supportedServiceIds.length
    )
      throw new ApiError(
        400,
        'INVALID_SERVICE_IDS',
        'Supported services must exist',
      );
    barber.set(input);
    await barber.save({ session });
    return barber;
  });
}
export async function saveSchedule(
  barberId: string,
  input: z.infer<typeof scheduleInput>,
  policy: BookingPolicy = defaultPolicy,
) {
  return mongoose.connection.transaction(async (session) => {
    await enterBookingTransaction(session);
    const barber = await Barber.findById(barberId).session(session).lean();
    const business = await WorkingSchedule.findById('business')
      .session(session)
      .lean();
    const schedule = await WorkingSchedule.findOne({
      kind: 'barber',
      barberId,
    }).session(session);
    if (!barber || !business || !schedule)
      throw new ApiError(404, 'SCHEDULE_NOT_FOUND', 'Schedule not found');
    if (
      input.hours.some((day) =>
        day.periods.some(
          (period) =>
            !business.hours
              .find((b) => b.day === day.day)
              ?.periods.some(
                (b) => period.opens >= b.opens && period.closes <= b.closes,
              ),
        ),
      )
    )
      throw new ApiError(
        400,
        'OUTSIDE_BUSINESS_HOURS',
        'Working hours must fit within business hours',
      );
    const proposed = {
      ...input,
      timeOff: input.timeOff.map((period) => ({
        startsAt: new Date(period.startsAt),
        endsAt: new Date(period.endsAt),
      })),
    };
    const appointments = await Appointment.find({
      barberId,
      status: { $in: ['pending', 'confirmed'] },
      endsAt: { $gt: new Date() },
    })
      .session(session)
      .lean();
    for (const appointment of appointments) {
      if (
        !canBook({
          startsAt: appointment.startsAt,
          durationMinutes:
            (appointment.endsAt.getTime() - appointment.startsAt.getTime()) /
            60000,
          business,
          barber: proposed,
          occupied: [],
          now: new Date(appointment.startsAt.getTime() - 86400000),
          policy: { ...policy, leadMinutes: 0, horizonDays: 365 },
        })
      )
        throw new ApiError(
          409,
          'EXISTING_BOOKING',
          'These hours or time off would invalidate an active appointment',
        );
    }
    schedule.set(proposed);
    await schedule.save({ session });
    return schedule;
  });
}
