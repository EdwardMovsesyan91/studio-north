import { Barber, Service, WorkingSchedule } from './models.js';
import { barberSeeds, serviceSeeds } from './seed-data.js';

const weekly = (periods: readonly (readonly [number, number] | null)[]) => periods.map((period, day) => ({ day, periods: period ? [{ opens: period[0], closes: period[1] }] : [] }));
export const businessHours = weekly([null, [540, 1140], [540, 1140], [540, 1140], [540, 1140], [540, 1140], [600, 1020]]);
export const barberHours = [
  weekly([null, [540, 1020], [540, 1020], [540, 1020], [540, 1020], [540, 1020], [600, 900]]),
  weekly([null, null, [660, 1140], [660, 1140], [660, 1140], [660, 1140], [600, 1020]]),
  weekly([null, [600, 1080], [600, 1080], null, [600, 1080], [600, 1080], [600, 1020]]),
];
export async function seedDevelopment(timezone = 'America/Los_Angeles') {
  const timestamps = { createdAt: new Date(), updatedAt: new Date() };
  const options = { upsert: true, runValidators: true, timestamps: false };
  for (const service of serviceSeeds) await Service.updateOne({ _id: service._id }, { $setOnInsert: { ...service, ...timestamps } }, options);
  for (const barber of barberSeeds) await Barber.updateOne({ _id: barber._id }, { $setOnInsert: { ...barber, ...timestamps } }, options);
  await WorkingSchedule.updateOne({ _id: 'business' }, { $setOnInsert: { ...timestamps, kind: 'business', barberId: null, timezone, hours: businessHours, timeOff: [] } }, options);
  for (const [index, barber] of barberSeeds.entries()) {
    await WorkingSchedule.updateOne({ _id: `barber-${barber._id}` }, { $setOnInsert: { ...timestamps, kind: 'barber', barberId: barber._id, timezone, hours: barberHours[index]!, timeOff: [] } }, options);
  }
}
