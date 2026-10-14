import mongoose from 'mongoose';
import type { ClientSession } from 'mongoose';
import { randomBytes, createHash } from 'node:crypto';
import { Appointment, Barber, OccupancyBlock, Service, WorkingSchedule } from './models.js';
import { ApiError, isDuplicateKey, slotConflict } from './errors.js';
import { blocksFor, canBook, dateInstants, localParts } from './scheduling.js';
import type { BookingPolicy, Schedule } from './scheduling.js';
import { enterBookingTransaction } from './gate.js';

export interface BookingInput { serviceId: string; barberId: string; startsAt: string; customer: { name: string; email: string; phone?: string | undefined } }

async function context(serviceId: string, barberId: string, timezone: string, session: ClientSession | null) {
  const service = await Service.findOne({ _id: serviceId, isActive: true }).session(session).lean();
  if (!service) throw new ApiError(404, 'SERVICE_NOT_FOUND', 'Active service not found');
  const query = { isActive: true, supportedServiceIds: serviceId, ...(barberId === 'any' ? {} : { _id: barberId }) };
  const barbers = await Barber.find(query).sort({ _id: 1 }).session(session).lean();
  if (barberId !== 'any' && barbers.length === 0) {
    const exists = await Barber.exists({ _id: barberId, isActive: true }).session(session);
    throw new ApiError(exists ? 400 : 404, exists ? 'UNSUPPORTED_SERVICE' : 'BARBER_NOT_FOUND', exists ? 'Barber does not support this service' : 'Active barber not found');
  }
  const business = await WorkingSchedule.findById('business').session(session).lean();
  const schedules = await WorkingSchedule.find({ kind: 'barber', barberId: { $in: barbers.map(({ _id }) => _id) } }).session(session).lean();
  if (!business || business.timezone !== timezone) throw new ApiError(503, 'SCHEDULE_UNAVAILABLE', 'Business scheduling is not configured for this timezone');
  return { service, barbers, business, schedules };
}

export async function getAvailability(serviceId: string, barberId: string, date: string, policy: BookingPolicy, now = new Date()) {
  const startDate = localParts(now, policy.timezone).date;
  const lastDate = localParts(new Date(now.getTime() + policy.horizonDays * 86400000), policy.timezone).date;
  if (date < startDate || date > lastDate) throw new ApiError(400, 'DATE_OUT_OF_RANGE', 'Date is outside the booking horizon');
  const data = await context(serviceId, barberId, policy.timezone, null);
  const instants = dateInstants(date, policy.timezone);
  const occupied = await Appointment.find({ barberId: { $in: data.barbers.map(({ _id }) => _id) }, status: { $ne: 'cancelled' }, startsAt: { $lt: new Date(instants.at(-1)!.getTime() + 86400000) }, endsAt: { $gt: instants[0]! } }).lean();
  const slots = instants.flatMap((startsAt) => {
    const eligible = data.barbers.filter((barber) => {
      const schedule = data.schedules.find((schedule) => schedule.barberId === barber._id);
      return schedule && canBook({ startsAt, durationMinutes: data.service.durationMinutes, business: data.business, barber: schedule, occupied: occupied.filter((appointment) => appointment.barberId === barber._id), now, policy });
    });
    return eligible.length ? [{ startsAt: startsAt.toISOString(), endsAt: new Date(startsAt.getTime() + data.service.durationMinutes * 60000).toISOString(), localTime: localParts(startsAt, policy.timezone).minute, barbers: eligible.map((barber) => ({ id: barber._id, name: barber.name })) }] : [];
  });
  return { fictionalDemo: true, serviceId, date, timezone: policy.timezone, slots, emptyReason: slots.length ? null : data.barbers.length ? 'NO_AVAILABLE_SLOTS' : 'NO_ELIGIBLE_BARBERS' };
}

export function publicAppointment(appointment: { reference: string; serviceId: string; barberId: string; startsAt: Date; endsAt: Date; status: string; serviceNameSnapshot: string; priceCentsSnapshot: number }) {
  return { reference: appointment.reference, serviceId: appointment.serviceId, barberId: appointment.barberId, startsAt: appointment.startsAt.toISOString(), endsAt: appointment.endsAt.toISOString(), status: appointment.status, serviceName: appointment.serviceNameSnapshot, priceCents: appointment.priceCentsSnapshot, currency: 'USD', fictionalDemo: true };
}

export async function createAppointment(input: BookingInput, policy: BookingPolicy, idempotencyKey?: string) {
  const requestHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  if (idempotencyKey) {
    const existing = await Appointment.findOne({ idempotencyKey }).lean();
    if (existing) {
      if (existing.requestHash !== requestHash) throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'This submission key belongs to different booking details');
      return publicAppointment(existing);
    }
  }
  // Each candidate gets its own transaction: an aborted unique-key conflict for
  // Any Available can safely try a different eligible barber.
  const initial = await context(input.serviceId, input.barberId, policy.timezone, null);
  for (const candidate of initial.barbers) {
    try {
      return await mongoose.connection.transaction(async (session) => {
        await enterBookingTransaction(session);
        if (idempotencyKey) {
          const existing = await Appointment.findOne({ idempotencyKey }).session(session).lean();
          if (existing) {
            if (existing.requestHash !== requestHash) throw new ApiError(409, 'IDEMPOTENCY_CONFLICT', 'This submission key belongs to different booking details');
            return publicAppointment(existing);
          }
        }
        const now = new Date();
        const data = await context(input.serviceId, candidate._id, policy.timezone, session);
        const startsAt = new Date(input.startsAt);
        const endsAt = new Date(startsAt.getTime() + data.service.durationMinutes * 60000);
        if (startsAt.getTime() < now.getTime() + Math.max(1, policy.leadMinutes * 60000) || endsAt.getTime() > now.getTime() + policy.horizonDays * 86400000) throw new ApiError(400, 'OUTSIDE_BOOKING_WINDOW', 'Time is outside the allowed booking window');
        const schedule = data.schedules.find((schedule) => schedule.barberId === candidate._id);
        const occupied = await Appointment.find({ barberId: candidate._id, status: { $ne: 'cancelled' }, startsAt: { $lt: endsAt }, endsAt: { $gt: startsAt } }).session(session).lean();
        if (!schedule || !canBook({ startsAt, durationMinutes: data.service.durationMinutes, business: data.business, barber: schedule, occupied, now, policy })) throw slotConflict();
        const appointmentId = new mongoose.Types.ObjectId();
        // Database-enforced reservations are the concurrency gate, not the reads above.
        await OccupancyBlock.insertMany(blocksFor(startsAt, endsAt).map((start) => ({ barberId: candidate._id, startsAt: start, appointmentId })), { session, ordered: true });
        const [appointment] = await Appointment.create([{
          _id: appointmentId, reference: randomBytes(24).toString('base64url'), serviceId: data.service._id,
          barberId: candidate._id, customerName: input.customer.name, customerEmail: input.customer.email,
          ...(input.customer.phone ? { customerPhone: input.customer.phone } : {}), startsAt, endsAt,
          status: 'pending', serviceNameSnapshot: data.service.name, priceCentsSnapshot: data.service.priceCents,
          ...(idempotencyKey ? { idempotencyKey, requestHash } : {}),
        }], { session });
        if (!appointment) throw new Error('Transaction did not create appointment');
        return publicAppointment(appointment);
      }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, maxCommitTimeMS: 10000 });
    } catch (error) {
      // Only an occupancy unique-index violation is a genuine slot conflict.
      const occupancyConflict = isDuplicateKey(error) && (
        (typeof error === 'object' && error !== null && 'keyPattern' in error &&
          typeof error.keyPattern === 'object' && error.keyPattern !== null && 'barberId' in error.keyPattern && 'startsAt' in error.keyPattern) ||
        // insertMany may wrap duplicate errors in MongoBulkWriteError without
        // a top-level keyPattern. Match only our explicitly named unique index.
        (error instanceof Error && /index: unique_barber_slot\s/.test(error.message))
      );
      if (occupancyConflict || (error instanceof ApiError && error.code === 'SLOT_CONFLICT')) {
        if (input.barberId === 'any') continue;
        throw slotConflict();
      }
      if (input.barberId === 'any' && error instanceof ApiError && ['BARBER_NOT_FOUND', 'UNSUPPORTED_SERVICE'].includes(error.code)) continue;
      throw error;
    }
  }
  throw slotConflict();
}

// Internal domain operation only: no unauthenticated public status endpoint.
export async function changeAppointmentStatus(reference: string, nextStatus: 'confirmed' | 'cancelled' | 'completed') {
  return mongoose.connection.transaction(async (session) => {
    await enterBookingTransaction(session);
    const appointment = await Appointment.findOne({ reference }).session(session);
    if (!appointment) throw new ApiError(404, 'APPOINTMENT_NOT_FOUND', 'Appointment not found');
    if (appointment.status === nextStatus) return publicAppointment(appointment);
    const allowed = appointment.status === 'pending' ? ['confirmed', 'cancelled'] : appointment.status === 'confirmed' ? ['completed', 'cancelled'] : [];
    if (!allowed.includes(nextStatus)) throw new ApiError(409, 'INVALID_STATUS_TRANSITION', 'Appointment status cannot be changed this way');
    appointment.status = nextStatus;
    await appointment.save({ session });
    if (nextStatus === 'cancelled') await OccupancyBlock.deleteMany({ appointmentId: appointment._id }).session(session);
    return publicAppointment(appointment);
  }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
}

// Exported structural type helps domain consumers without exposing Mongoose internals.
export type { Schedule };
