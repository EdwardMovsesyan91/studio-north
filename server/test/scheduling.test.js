import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blocksFor, canBook, dateInstants, defaultPolicy, localParts } from '../dist/booking/scheduling.js';
import { businessHours } from '../dist/booking/seed.js';
const business = { timezone: 'America/Los_Angeles', hours: businessHours, timeOff: [] };
const barber = { ...business, hours: businessHours.map(day => ({ ...day, periods: day.periods.map(period => ({ ...period, closes: Math.min(period.closes, 1020) })) })) };
const now = new Date('2026-01-01T00:00:00Z');
const fits = (startsAt, durationMinutes = 45, overrides = {}) => canBook({ startsAt: new Date(startsAt), durationMinutes, business, barber, occupied: [], now, policy: defaultPolicy, ...overrides });

test('business/barber opening, closing, duration and Sunday restrictions', () => {
  assert.equal(fits('2026-01-05T16:45:00Z'), false); // 08:45 Pacific
  assert.equal(fits('2026-01-05T17:00:00Z'), true);
  assert.equal(fits('2026-01-06T00:15:00Z'), true); // Ends at barber 17:00
  assert.equal(fits('2026-01-06T00:30:00Z'), false);
  assert.equal(fits('2026-01-06T02:00:00Z'), false); // Business open, barber closed
  assert.equal(fits('2026-01-05T23:45:00Z', 75), true);
  assert.equal(fits('2026-01-06T00:00:00Z', 75), false);
  assert.equal(fits('2026-01-04T18:00:00Z'), false);
  assert.equal(fits('2026-01-03T17:45:00Z'), false); // Saturday opens 10
  assert.equal(fits('2026-01-03T18:00:00Z'), true);
});
test('adjacent intervals, overlap and barber/business time off', () => {
  const interval = { startsAt: new Date('2026-01-05T18:00:00Z'), endsAt: new Date('2026-01-05T18:45:00Z') };
  assert.equal(fits('2026-01-05T17:15:00Z', 45, { occupied: [interval] }), true);
  assert.equal(fits('2026-01-05T18:45:00Z', 45, { occupied: [interval] }), true);
  assert.equal(fits('2026-01-05T17:30:00Z', 45, { occupied: [interval] }), false);
  assert.equal(fits('2026-01-05T18:00:00Z', 45, { barber: { ...barber, timeOff: [interval] } }), false);
  assert.equal(fits('2026-01-05T18:00:00Z', 45, { business: { ...business, timeOff: [interval] } }), false);
});
test('past, lead time, horizon and 15-minute alignment are authoritative', () => {
  assert.equal(fits('2026-01-05T18:00:00Z', 45, { now: new Date('2026-01-05T18:01:00Z') }), false);
  assert.equal(fits('2026-01-05T18:00:00Z', 45, { now: new Date('2026-01-05T17:01:00Z') }), false);
  assert.equal(fits('2026-01-05T18:00:00Z', 45, { now: new Date('2026-01-05T17:00:00Z') }), true);
  assert.equal(fits('2026-01-05T18:00:00Z', 45, { policy: { ...defaultPolicy, horizonDays: 1 } }), false);
  assert.equal(fits('2026-01-05T18:01:00Z'), false);
  assert.equal(fits('2026-01-05T18:00:00Z', 0), false);
});
test('occupancy covers every 15-minute block, including partial final duration', () => {
  const start = new Date('2026-01-05T18:00:00Z');
  assert.equal(blocksFor(start, new Date('2026-01-05T18:45:00Z')).length, 3);
  assert.equal(blocksFor(start, new Date('2026-01-05T18:46:00Z')).length, 4);
});
test('DST spring skips nonexistent slots and autumn distinguishes repeated instants', () => {
  const spring = dateInstants('2026-03-08', business.timezone);
  const fall = dateInstants('2026-11-01', business.timezone);
  assert.equal(spring.length, 92);
  assert.equal(fall.length, 100);
  assert.equal(spring.some(date => localParts(date, business.timezone).minute >= 120 && localParts(date, business.timezone).minute < 180), false);
  const repeated = fall.filter(date => localParts(date, business.timezone).minute === 90);
  assert.equal(repeated.length, 2);
  assert.equal(repeated[1].getTime() - repeated[0].getTime(), 3600000);
  const restricted = { ...business, hours: [{ day: 0, periods: [{ opens: 90, closes: 120 }] }] };
  const autumnPolicy = { ...defaultPolicy, horizonDays: 365 };
  assert.equal(fits(repeated[0].toISOString(), 60, { business: restricted, barber: restricted, policy: autumnPolicy }), false);
  assert.equal(fits(repeated[1].toISOString(), 30, { business: restricted, barber: restricted, policy: autumnPolicy }), true);
});
