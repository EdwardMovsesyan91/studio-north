import type { ClientSession } from 'mongoose';
import { ApiError } from './errors.js';
import { BookingState } from './models.js';

// This deliberately serializes low-volume demo mutations across API instances.
// Booking, catalog/schedule edits and reset all write before their authoritative reads.
export async function enterBookingTransaction(session: ClientSession) {
  const gate = await BookingState.findOneAndUpdate(
    { _id: 'booking' },
    { $inc: { revision: 1 } },
    { session, returnDocument: 'after' },
  );
  if (!gate)
    throw new ApiError(
      503,
      'BOOKING_UNAVAILABLE',
      'Booking state has not been initialized',
    );
}
