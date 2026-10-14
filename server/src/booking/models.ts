import { Schema, model } from 'mongoose';

const identifier = { type: String, required: true, maxlength: 80, match: /^[a-z0-9-]+$/ };
const text = (max: number) => ({ type: String, required: true, trim: true, maxlength: max });
const integer = (min: number, max: number) => ({ type: Number, required: true, min, max, validate: Number.isInteger });
const options = { timestamps: true, strict: 'throw' as const, autoIndex: false, bufferCommands: false };

const serviceSchema = new Schema({
  _id: identifier, name: text(100), slug: identifier, description: text(1000),
  durationMinutes: integer(15, 480), priceCents: integer(0, 1000000),
  isActive: { type: Boolean, required: true }, displayOrder: integer(0, 10000),
}, options);
serviceSchema.index({ slug: 1 }, { unique: true });
serviceSchema.index({ isActive: 1, displayOrder: 1 });
export const Service = model('Service', serviceSchema);

const barberSchema = new Schema({
  _id: identifier, name: text(100), slug: identifier, title: text(100), biography: text(2000),
  specialty: text(200), portrait: { type: String, default: null, maxlength: 300 },
  supportedServiceIds: { type: [String], required: true, validate: (ids: string[]) => ids.length > 0 && ids.every(id => /^[a-z0-9-]{1,80}$/.test(id)) && new Set(ids).size === ids.length },
  isActive: { type: Boolean, required: true },
}, options);
barberSchema.index({ slug: 1 }, { unique: true });
barberSchema.index({ isActive: 1, supportedServiceIds: 1 });
export const Barber = model('Barber', barberSchema);

const periodSchema = new Schema({ opens: integer(0, 1439), closes: integer(1, 1440) }, { _id: false });
periodSchema.path('closes').validate(function (value: number) { return value > this.opens; }, 'Closing must follow opening');
const validPeriods = (periods: { opens: number; closes: number }[]) => periods.every((period, index) => period.opens < period.closes && periods.every((other, otherIndex) => otherIndex === index || period.closes <= other.opens || period.opens >= other.closes));
const hoursSchema = new Schema({ day: integer(0, 6), periods: { type: [periodSchema], default: [], validate: validPeriods } }, { _id: false });
const exceptionSchema = new Schema({ startsAt: { type: Date, required: true }, endsAt: { type: Date, required: true } }, { _id: false });
exceptionSchema.path('endsAt').validate(function (value: Date) { return value > this.startsAt; }, 'Time off must have positive duration');
const scheduleSchema = new Schema({
  _id: { type: String, required: true }, kind: { type: String, enum: ['business', 'barber'], required: true },
  barberId: { type: String, default: null },
  timezone: { ...text(100), validate: (zone: string) => { try { new Intl.DateTimeFormat('en', { timeZone: zone }); return true; } catch { return false; } } },
  hours: { type: [hoursSchema], required: true, validate: (hours: { day: number }[]) => hours.length === 7 && new Set(hours.map(({ day }) => day)).size === 7 },
  timeOff: { type: [exceptionSchema], default: [] },
}, options);
scheduleSchema.pre('validate', function () {
  if (this.kind === 'business' ? this.barberId !== null : !this.barberId || !/^[a-z0-9-]{1,80}$/.test(this.barberId)) this.invalidate('barberId', 'Schedule kind and barber must agree');
});
scheduleSchema.index({ kind: 1, barberId: 1 }, { unique: true });
export const WorkingSchedule = model('WorkingSchedule', scheduleSchema);

export const appointmentStatuses = ['pending', 'confirmed', 'cancelled', 'completed'] as const;
const appointmentSchema = new Schema({
  idempotencyKey: { type: String, immutable: true }, requestHash: { type: String, immutable: true },
  reference: { ...text(64), immutable: true }, serviceId: identifier, barberId: identifier,
  customerName: text(100), customerEmail: text(254), customerPhone: { type: String, maxlength: 30 },
  startsAt: { type: Date, required: true }, endsAt: { type: Date, required: true },
  status: { type: String, enum: appointmentStatuses, default: 'pending', required: true },
  serviceNameSnapshot: { ...text(100), immutable: true }, priceCentsSnapshot: { ...integer(0, 1000000), immutable: true },
}, options);
appointmentSchema.path('endsAt').validate(function (value: Date) { return value > this.startsAt; }, 'Appointment must have positive duration');
appointmentSchema.index({ reference: 1 }, { unique: true });
appointmentSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
appointmentSchema.index({ barberId: 1, status: 1, startsAt: 1, endsAt: 1 });
export const Appointment = model('Appointment', appointmentSchema);

const blockSchema = new Schema({
  barberId: identifier, startsAt: { type: Date, required: true },
  appointmentId: { type: Schema.Types.ObjectId, required: true, ref: 'Appointment' },
}, { strict: 'throw', autoIndex: false, bufferCommands: false });
blockSchema.index({ barberId: 1, startsAt: 1 }, { unique: true, name: 'unique_barber_slot' });
blockSchema.index({ appointmentId: 1 });
export const OccupancyBlock = model('OccupancyBlock', blockSchema);

const limitSchema = new Schema({ _id: { type: String, required: true }, count: integer(0, 100000000), expiresAt: { type: Date, required: true } }, { autoIndex: false, bufferCommands: false });
limitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const BookingRateLimit = model('BookingRateLimit', limitSchema);

export const BookingState = model('BookingState', new Schema({ _id: { type: String, required: true }, revision: { type: Number, default: 0 }, demoDesignated: { type: Boolean, default: false } }, { autoIndex: false, bufferCommands: false }));

export async function ensureBookingIndexes() {
  // Add declared indexes; never syncIndexes/drop existing indexes or data.
  for (const collection of [Service, Barber, WorkingSchedule, Appointment, OccupancyBlock, BookingRateLimit]) await collection.createIndexes();
  await BookingState.createIndexes();
  await BookingState.updateOne({ _id: 'booking' }, { $setOnInsert: { revision: 0, demoDesignated: false } }, { upsert: true });
}
