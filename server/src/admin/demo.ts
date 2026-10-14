import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import {
  Appointment,
  Barber,
  BookingState,
  OccupancyBlock,
  Service,
  WorkingSchedule,
} from '../booking/models.js';
import { enterBookingTransaction } from '../booking/gate.js';
import { ApiError } from '../booking/errors.js';
import { barberSeeds, serviceSeeds } from '../booking/seed-data.js';
import { businessHours, barberHours } from '../booking/seed.js';
import { blocksFor, dateInstants, localParts } from '../booking/scheduling.js';

export function assertDemoDatabase() {
  if (
    !/^studio_north_demo_[a-z0-9_]{1,12}$/.test(mongoose.connection.name) ||
    mongoose.connection.name.length > 38
  )
    throw new ApiError(
      403,
      'DEMO_RESTRICTED',
      'Demo operations require an explicitly designated demo database',
    );
}
export async function designateDemo() {
  assertDemoDatabase();
  const gate = await BookingState.findById('booking');
  if (!gate) throw new Error('Booking state not initialized');
  if (!gate.demoDesignated && (await Appointment.exists({})))
    throw new ApiError(
      403,
      'DEMO_RESTRICTED',
      'Cannot designate a database containing appointments',
    );
  gate.demoDesignated = true;
  await gate.save();
}
export async function resetDemo(timezone = 'America/Los_Angeles') {
  assertDemoDatabase();
  return mongoose.connection.transaction(
    async (session) => {
      await enterBookingTransaction(session);
      const state = await BookingState.findById('booking')
        .session(session)
        .lean();
      if (!state?.demoDesignated)
        throw new ApiError(
          403,
          'DEMO_RESTRICTED',
          'An operator must designate this demo database first',
        );
      // No dropDatabase; only application demo collections inside this guarded DB.
      for (const model of [
        OccupancyBlock,
        Appointment,
        WorkingSchedule,
        Barber,
        Service,
      ])
        await model.collection.deleteMany({}, { session });
      await Service.insertMany(serviceSeeds, { session });
      await Barber.insertMany(barberSeeds, { session });
      await WorkingSchedule.create(
        [
          {
            _id: 'business',
            kind: 'business',
            barberId: null,
            timezone,
            hours: businessHours,
            timeOff: [],
          },
          ...barberSeeds.map((barber, index) => ({
            _id: `barber-${barber._id}`,
            kind: 'barber' as const,
            barberId: barber._id,
            timezone,
            hours: barberHours[index]!,
            timeOff: [],
          })),
        ],
        { session, ordered: true },
      );
      const local = localParts(new Date(), timezone);
      const anchor = new Date(`${local.date}T00:00:00Z`);
      const daysToMonday = (8 - anchor.getUTCDay()) % 7 || 7;
      const dates = [daysToMonday, daysToMonday + 1, daysToMonday - 7].map(
        (days) =>
          new Date(anchor.getTime() + days * 86400000)
            .toISOString()
            .slice(0, 10),
      );
      for (const [index, date] of dates.entries()) {
        const barber = barberSeeds[index]!;
        const service = serviceSeeds[index]!;
        const startsAt = dateInstants(date, timezone).find(
          (instant) =>
            localParts(instant, timezone).minute === 600 + index * 60,
        )!;
        const endsAt = new Date(
          startsAt.getTime() + service.durationMinutes * 60000,
        );
        const [appointment] = await Appointment.create(
          [
            {
              reference: createHash('sha256')
                .update(`demo:${date}:${index}`)
                .digest('base64url')
                .slice(0, 32),
              serviceId: service._id,
              barberId: barber._id,
              customerName: `Demo Guest ${index + 1}`,
              customerEmail: `guest${index + 1}@studio-north.invalid`,
              startsAt,
              endsAt,
              status:
                index === 0
                  ? 'pending'
                  : index === 1
                    ? 'confirmed'
                    : 'completed',
              serviceNameSnapshot: service.name,
              priceCentsSnapshot: service.priceCents,
            },
          ],
          { session, ordered: true },
        );
        await OccupancyBlock.insertMany(
          blocksFor(startsAt, endsAt).map((start) => ({
            barberId: barber._id,
            startsAt: start,
            appointmentId: appointment!._id,
          })),
          { session },
        );
      }
      return { reset: true, fictionalDemo: true };
    },
    { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } },
  );
}
