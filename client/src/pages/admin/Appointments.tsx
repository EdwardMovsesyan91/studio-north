import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { appointmentTime, money, request } from '../../api';
import { QueryMessage } from '../../components/QueryMessage';
import { adminAppointmentSchema, adminBarberSchema, write } from './contracts';
import type { Session } from './contracts';
export function Status({ status }: { status: string }) {
  return (
    <span className="status-label">
      <span aria-hidden="true">
        {status === 'completed'
          ? '\u2713'
          : status === 'cancelled'
            ? '\u00d7'
            : status === 'confirmed'
              ? '\u25c6'
              : '\u25f7'}
      </span>{' '}
      {status}
    </span>
  );
}
export function Overview() {
  const query = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () =>
      request(
        '/admin/overview',
        z.object({
          counts: z.object({
            pending: z.number(),
            confirmed: z.number(),
            completed: z.number(),
            cancelled: z.number(),
          }),
          revenueCents: z.number(),
          upcoming: z.array(adminAppointmentSchema),
        }),
      ),
  });
  return (
    <section className="admin-page">
      <p className="type-label text-accent mb-3">At a glance</p>
      <h1 className="type-title">The day ahead.</h1>
      <QueryMessage
        pending={query.isPending}
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
      />
      {query.data && (
        <>
          <dl className="overview-grid mt-8">
            {Object.entries(query.data.counts).map(([status, count]) => (
              <div key={status}>
                <dt>
                  <Status status={status} />
                </dt>
                <dd className="type-title mt-3">{count}</dd>
              </div>
            ))}
            <div>
              <dt>Estimated completed revenue</dt>
              <dd className="type-title mt-3">
                {money(query.data.revenueCents)}
              </dd>
              <p className="type-caption text-secondary">
                Saved appointment snapshots; no payments collected.
              </p>
            </div>
          </dl>
          <h2 className="type-subtitle mt-10">Upcoming appointments</h2>
          <ul className="admin-records">
            {query.data.upcoming.map((appointment) => (
              <li key={appointment.reference}>
                <strong>{appointment.serviceNameSnapshot}</strong>
                <span>{appointmentTime(appointment.startsAt)}</span>
                <Status status={appointment.status} />
              </li>
            ))}
          </ul>
          {!query.data.upcoming.length && (
            <p className="mt-4">No upcoming appointments.</p>
          )}
        </>
      )}
    </section>
  );
}
export function Appointments({ session }: { session: Session }) {
  const [date, setDate] = useState(''),
    [status, setStatus] = useState(''),
    [selected, setSelected] = useState('');
  const client = useQueryClient();
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (status) params.set('status', status);
  const query = useQuery({
    queryKey: ['admin', 'appointments', date, status],
    queryFn: () =>
      request(
        `/admin/appointments?${params}`,
        z.object({ appointments: z.array(adminAppointmentSchema) }),
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
  const mutation = useMutation({
    mutationFn: ({
      reference,
      status,
    }: {
      reference: string;
      status: string;
    }) => write(`/appointments/${reference}/status`, { status }, session),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['admin'] });
      void client.invalidateQueries({ queryKey: ['availability'] });
    },
  });
  const appointment = query.data?.appointments.find(
    (appointment) => appointment.reference === selected,
  );
  return (
    <section className="admin-page">
      <h1 className="type-title">Appointments.</h1>
      <p className="type-caption text-secondary mt-3">
        Pacific local dates · America/Los_Angeles · latest 200 matching records
      </p>
      <div className="form-actions mt-6">
        <label className="field">
          Filter date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="field">
          Status
          <select
            aria-label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {['pending', 'confirmed', 'cancelled', 'completed'].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="button"
          data-variant="quiet"
          onClick={() => {
            setDate('');
            setStatus('');
          }}
        >
          Clear filters
        </button>
      </div>
      <QueryMessage
        pending={query.isPending}
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
      />
      <ul className="admin-records">
        {query.data?.appointments.map((item) => (
          <li key={item.reference}>
            <div>
              <strong>{item.serviceNameSnapshot}</strong>
              <p className="type-caption text-secondary">
                {appointmentTime(item.startsAt)} ·{' '}
                {barbers.data?.barbers.find(
                  (barber) => barber._id === item.barberId,
                )?.name ?? item.barberId}
              </p>
            </div>
            <Status status={item.status} />
            <button
              type="button"
              className="button"
              data-variant="secondary"
              onClick={() => setSelected(item.reference)}
            >
              Details
            </button>
          </li>
        ))}
      </ul>
      {query.data && !query.data.appointments.length && (
        <p role="status">No matching appointments.</p>
      )}
      {appointment && (
        <section className="admin-detail mt-8" aria-label="Appointment details">
          <h2 className="type-subtitle">{appointment.serviceNameSnapshot}</h2>
          <dl className="review-list mt-6">
            <dt>Customer</dt>
            <dd>{appointment.customerName}</dd>
            <dt>Email</dt>
            <dd>{appointment.customerEmail}</dd>
            <dt>Phone</dt>
            <dd>{appointment.customerPhone ?? 'Not provided'}</dd>
            <dt>Reference</dt>
            <dd className="break-all">{appointment.reference}</dd>
            <dt>Time</dt>
            <dd>{appointmentTime(appointment.startsAt)}</dd>
            <dt>Price snapshot</dt>
            <dd>{money(appointment.priceCentsSnapshot)}</dd>
            <dt>Status</dt>
            <dd>
              <Status status={appointment.status} />
            </dd>
          </dl>
          <div className="form-actions mt-6">
            {(appointment.status === 'pending'
              ? ['confirmed', 'cancelled']
              : appointment.status === 'confirmed'
                ? ['completed', 'cancelled']
                : []
            ).map((target) => (
              <button
                key={target}
                type="button"
                className="button"
                data-variant={target === 'cancelled' ? 'secondary' : 'primary'}
                disabled={mutation.isPending}
                onClick={() => {
                  if (
                    target !== 'cancelled' ||
                    window.confirm(
                      'Cancel this demo appointment and release its reserved time?',
                    )
                  )
                    mutation.mutate({
                      reference: appointment.reference,
                      status: target,
                    });
                }}
              >
                {target === 'confirmed'
                  ? 'Confirm'
                  : target === 'completed'
                    ? 'Complete'
                    : 'Cancel appointment'}
              </button>
            ))}
            <button
              className="button"
              data-variant="quiet"
              type="button"
              onClick={() => setSelected('')}
            >
              Close details
            </button>
          </div>
          {mutation.error && <p role="alert">{mutation.error.message}</p>}
          {mutation.isSuccess && (
            <p role="status">Appointment updated by the server.</p>
          )}
        </section>
      )}
    </section>
  );
}
