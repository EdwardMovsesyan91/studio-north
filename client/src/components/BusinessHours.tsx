import { useBusiness } from '../api';
import { QueryMessage } from './QueryMessage';
const days = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const clock = (minute: number) =>
  new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2000, 0, 1, 0, minute)));
export function BusinessHours() {
  const query = useBusiness();
  const sorted = [...(query.data?.hours ?? [])].sort(
    (a, b) => (a.day || 7) - (b.day || 7),
  );
  const groups: {
    start: number;
    end: number;
    periods: { opens: number; closes: number }[];
  }[] = [];
  sorted.forEach((day) => {
    const previous = groups.at(-1);
    if (
      previous &&
      previous.end + 1 === day.day &&
      JSON.stringify(previous.periods) === JSON.stringify(day.periods)
    )
      previous.end = day.day;
    else groups.push({ start: day.day, end: day.day, periods: day.periods });
  });
  return (
    <>
      <QueryMessage
        pending={query.isPending}
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
      />
      <dl className="business-hours type-caption">
        {groups.map((group) => (
          <div
            key={group.start}
            className="flex flex-wrap justify-between gap-x-5 gap-y-1"
          >
            <dt>
              {days[group.start]}
              {group.end !== group.start ? `–${days[group.end]}` : ''}
            </dt>
            <dd>
              {group.periods.length
                ? group.periods
                    .map(
                      (period) =>
                        `${clock(period.opens)}–${clock(period.closes)}`,
                    )
                    .join(', ')
                : 'Closed'}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}
