export interface Period { opens: number; closes: number }
export interface Schedule {
  timezone: string;
  hours: readonly { day: number; periods: readonly Period[] }[];
  timeOff: readonly { startsAt: Date; endsAt: Date }[];
}
export interface Occupied { startsAt: Date; endsAt: Date }
export interface BookingPolicy { leadMinutes: number; horizonDays: number; timezone: string; rateLimitMax: number }
export const defaultPolicy: BookingPolicy = { leadMinutes: 60, horizonDays: 60, timezone: 'America/Los_Angeles', rateLimitMax: 10 };
export const blockMilliseconds = 15 * 60 * 1000;

const formatters = new Map<string, Intl.DateTimeFormat>();
export function localParts(instant: Date, timezone: string) {
  let formatter = formatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    formatters.set(timezone, formatter);
  }
  const parts = formatter.formatToParts(instant);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  return { date, minute: Number(get('hour')) * 60 + Number(get('minute')), day: new Date(`${date}T00:00:00Z`).getUTCDay() };
}

export function blocksFor(startsAt: Date, endsAt: Date): Date[] {
  const blocks: Date[] = [];
  for (let time = startsAt.getTime(); time < endsAt.getTime(); time += blockMilliseconds) blocks.push(new Date(time));
  return blocks;
}
export function overlaps(start: Date, end: Date, occupied: Occupied) { return start < occupied.endsAt && end > occupied.startsAt; }

function insidePeriod(start: Date, end: Date, schedule: Schedule): boolean {
  const local = localParts(start, schedule.timezone);
  // Verify every occupied minute, not merely endpoints: DST jumps/repeated hours
  // cannot silently carry a booking through a closed local-clock period.
  const periods = schedule.hours.find(({ day }) => day === local.day)?.periods ?? [];
  return periods.some((period) => {
    for (let time = start.getTime(); time < end.getTime(); time += 60000) {
      const part = localParts(new Date(time), schedule.timezone);
      if (part.date !== local.date || part.minute < period.opens || part.minute >= period.closes) return false;
    }
    return true;
  });
}
export function canBook(input: { startsAt: Date; durationMinutes: number; business: Schedule; barber: Schedule; occupied: readonly Occupied[]; now: Date; policy: BookingPolicy }): boolean {
  const { startsAt, durationMinutes, business, barber, occupied, now, policy } = input;
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60000);
  if (!Number.isFinite(startsAt.getTime()) || !Number.isInteger(durationMinutes) || durationMinutes <= 0 || startsAt.getTime() % blockMilliseconds !== 0) return false;
  if (startsAt.getTime() < now.getTime() + Math.max(1, policy.leadMinutes * 60000) || endsAt.getTime() > now.getTime() + policy.horizonDays * 86400000) return false;
  if (business.timezone !== policy.timezone || barber.timezone !== policy.timezone) return false;
  return insidePeriod(startsAt, endsAt, business) && insidePeriod(startsAt, endsAt, barber) &&
    ![...business.timeOff, ...barber.timeOff, ...occupied].some((period) => overlaps(startsAt, endsAt, period));
}
export function dateInstants(date: string, timezone: string): Date[] {
  const midnight = Date.parse(`${date}T00:00:00Z`);
  const starts: Date[] = [];
  // Enumerate UTC instants, then project into the requested local day: omitted
  // spring-forward times never exist; both fall-back occurrences remain distinct.
  for (let time = midnight - 18 * 3600000; time < midnight + 42 * 3600000; time += blockMilliseconds) {
    const instant = new Date(time);
    if (localParts(instant, timezone).date === date) starts.push(instant);
  }
  return starts;
}
