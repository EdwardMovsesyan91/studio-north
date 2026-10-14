import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentTime, request } from '../../api';
import { QueryMessage } from '../../components/QueryMessage';
import { adminBarberSchema, scheduleSchema, write } from './contracts';
import type { Session } from './contracts';
const weekdays = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const clock = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
const minute = (value: string) => {
  const [hour, min] = value.split(':').map(Number);
  return (hour ?? 0) * 60 + (min ?? 0);
};
const interval = z
  .object({
    opens: z.string().regex(/^\d{2}:\d{2}$/),
    closes: z.string().regex(/^\d{2}:\d{2}$/),
  })
  .refine(
    (value) => minute(value.opens) < minute(value.closes),
    'Opening must be before closing.',
  );
const hoursForm = z.object({
  days: z
    .array(z.object({ closed: z.boolean(), periods: z.array(interval).max(4) }))
    .length(7),
});
type Hours = z.infer<typeof hoursForm>;
export function Schedules({ session }: { session: Session }) {
  const [editing, setEditing] = useState('');
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'schedules'],
    queryFn: () =>
      request(
        '/admin/schedules',
        z.object({ schedules: z.array(scheduleSchema) }),
      ),
  });
  const barbers = useQuery({
    queryKey: ['admin', 'barbers'],
    queryFn: () =>
      request(
        '/admin/barbers',
        z.object({ barbers: z.array(adminBarberSchema) }),
      ),
  });
  const form = useForm<Hours>({ resolver: zodResolver(hoursForm) });
  const watchedDays = useWatch({ control: form.control, name: 'days' });
  const schedule = query.data?.schedules.find(
    (item) => item.barberId === editing,
  );
  const mutation = useMutation({
    mutationFn: ({
      hours,
      timeOff,
    }: {
      hours: { day: number; periods: { opens: number; closes: number }[] }[];
      timeOff: { startsAt: string; endsAt: string }[];
    }) =>
      write(
        `/schedules/${editing}`,
        { timezone: 'America/Los_Angeles', hours, timeOff },
        session,
        'PUT',
      ),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin', 'schedules'] });
      void client.invalidateQueries({ queryKey: ['business'] });
      void client.invalidateQueries({ queryKey: ['availability'] });
    },
  });
  const submit = (values: Hours) =>
    mutation.mutate({
      hours: values.days.map((day, index) => ({
        day: index,
        periods: day.closed
          ? []
          : day.periods.map((period) => ({
              opens: minute(period.opens),
              closes: minute(period.closes),
            })),
      })),
      timeOff: schedule?.timeOff ?? [],
    });
  return (
    <section className="admin-page">
      <h1 className="type-title">Working hours.</h1>
      <p className="type-body text-secondary mt-4">
        Recurring hours use America/Los_Angeles. Changes that invalidate active
        appointments are rejected by the server.
      </p>
      <QueryMessage
        pending={query.isPending || barbers.isPending}
        error={query.error || barbers.error}
        onRetry={() => {
          void query.refetch();
          void barbers.refetch();
        }}
      />
      <label className="field mt-6">
        Barber
        <select
          aria-label="Barber"
          disabled={!query.data || !barbers.data}
          value={editing}
          onChange={(event) => {
            const id = event.target.value;
            setEditing(id);
            mutation.reset();
            const selected = query.data?.schedules.find(
              (item) => item.barberId === id,
            );
            form.reset({
              days: weekdays.map((_, day) => {
                const periods =
                  selected?.hours.find((item) => item.day === day)?.periods ??
                  [];
                return {
                  closed: !periods.length,
                  periods: periods.length
                    ? periods.map((period) => ({
                        opens: clock(period.opens),
                        closes: clock(period.closes),
                      }))
                    : [{ opens: '09:00', closes: '17:00' }],
                };
              }),
            });
          }}
        >
          <option value="">Select a barber</option>
          {barbers.data?.barbers.map((barber) => (
            <option key={barber._id} value={barber._id}>
              {barber.name}
            </option>
          ))}
        </select>
      </label>
      {schedule && (
        <>
          <form onSubmit={form.handleSubmit(submit)} noValidate>
            <div className="working-days">
              {weekdays.map((label, day) => (
                <fieldset key={label}>
                  <legend className="font-semibold">{label}</legend>
                  <label className="check-field">
                    <input
                      type="checkbox"
                      {...form.register(`days.${day}.closed`)}
                    />{' '}
                    Closed
                  </label>
                  {!watchedDays?.[day]?.closed && (
                    <>
                      {(watchedDays?.[day]?.periods ?? []).map((_, index) => (
                        <div className="form-actions" key={index}>
                          <label className="field">
                            Opens
                            <input
                              type="time"
                              {...form.register(
                                `days.${day}.periods.${index}.opens`,
                              )}
                            />
                          </label>
                          <label className="field">
                            Closes
                            <input
                              type="time"
                              {...form.register(
                                `days.${day}.periods.${index}.closes`,
                              )}
                            />
                          </label>
                          {index > 0 && (
                            <button
                              type="button"
                              className="button"
                              data-variant="quiet"
                              onClick={() =>
                                form.setValue(
                                  `days.${day}.periods`,
                                  form
                                    .getValues(`days.${day}.periods`)
                                    .filter((_, i) => i !== index),
                                )
                              }
                            >
                              Remove period
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        className="button"
                        data-variant="quiet"
                        disabled={
                          (watchedDays?.[day]?.periods ?? []).length >= 4
                        }
                        onClick={() =>
                          form.setValue(`days.${day}.periods`, [
                            ...form.getValues(`days.${day}.periods`),
                            { opens: '13:00', closes: '17:00' },
                          ])
                        }
                      >
                        Add working period
                      </button>
                    </>
                  )}
                  {form.formState.errors.days?.[day] && (
                    <p role="alert">Check the opening and closing times.</p>
                  )}
                </fieldset>
              ))}
            </div>
            <button
              className="button mt-6"
              data-variant="primary"
              disabled={mutation.isPending}
            >
              Save working hours
            </button>
          </form>
          <section className="mt-10">
            <h2 className="type-subtitle">Time off</h2>
            <p className="type-caption text-secondary mt-3">
              Enter explicit UTC instants; Pacific dates are shown for review.
              Overlap with active appointments is rejected.
            </p>
            <ul className="admin-records">
              {schedule.timeOff.map((period, index) => (
                <li key={period.startsAt + index}>
                  <span>
                    {appointmentTime(period.startsAt)} —{' '}
                    {appointmentTime(period.endsAt)}
                  </span>
                  <button
                    type="button"
                    className="button"
                    data-variant="secondary"
                    disabled={mutation.isPending}
                    onClick={() =>
                      mutation.mutate({
                        hours: schedule.hours,
                        timeOff: schedule.timeOff.filter((_, i) => i !== index),
                      })
                    }
                  >
                    Remove time off
                  </button>
                </li>
              ))}
            </ul>
            <TimeOffForm
              pending={mutation.isPending}
              onAdd={(period) =>
                mutation.mutate({
                  hours: schedule.hours,
                  timeOff: [...schedule.timeOff, period],
                })
              }
            />
          </section>
          {mutation.error && (
            <p className="notice mt-6" role="alert">
              {mutation.error.message}
            </p>
          )}
          {mutation.isSuccess && (
            <p role="status" className="mt-4">
              Schedule saved by the server.
            </p>
          )}
        </>
      )}
    </section>
  );
}

const timeOffForm = z
  .object({ startsAt: z.iso.datetime(), endsAt: z.iso.datetime() })
  .refine((value) => Date.parse(value.startsAt) < Date.parse(value.endsAt), {
    message: 'End must be after start.',
    path: ['endsAt'],
  });
function TimeOffForm({
  pending,
  onAdd,
}: {
  pending: boolean;
  onAdd: (period: { startsAt: string; endsAt: string }) => void;
}) {
  const form = useForm<z.infer<typeof timeOffForm>>({
    resolver: zodResolver(timeOffForm),
    defaultValues: { startsAt: '', endsAt: '' },
  });
  return (
    <form className="mt-6" onSubmit={form.handleSubmit(onAdd)} noValidate>
      {(['startsAt', 'endsAt'] as const).map((key) => (
        <label className="field" key={key}>
          {key === 'startsAt'
            ? 'Starts (UTC timestamp)'
            : 'Ends (UTC timestamp)'}
          <input
            {...form.register(key)}
            placeholder={
              key === 'startsAt'
                ? '2026-10-22T16:00:00Z'
                : '2026-10-22T20:00:00Z'
            }
            aria-invalid={!!form.formState.errors[key]}
          />
          {form.formState.errors[key] && (
            <span role="alert">{form.formState.errors[key]?.message}</span>
          )}
        </label>
      ))}
      <button className="button" data-variant="secondary" disabled={pending}>
        Add time off
      </button>
    </form>
  );
}
