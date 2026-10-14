import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router';
import {
  ApiError,
  appointmentSchema,
  appointmentTime,
  availabilitySchema,
  localDate,
  money,
  request,
  useBarbers,
  useBusiness,
  useServices,
} from '../api';
import type { Appointment } from '../api';
import { QueryMessage } from '../components/QueryMessage';

const customerSchema = z.object({
  name: z.string().trim().min(2, 'Enter at least two characters.').max(100),
  email: z.string().trim().pipe(z.email('Enter a valid email address.')),
  phone: z
    .string()
    .refine(
      (value) =>
        !value.trim() || /^\+?\d{7,15}$/.test(value.replace(/[\s()-]/g, '')),
      'Enter a phone number or leave this blank.',
    ),
});
type Customer = z.infer<typeof customerSchema>;
const steps = [
  'Service',
  'Barber',
  'Date & time',
  'Your details',
  'Review',
  'Confirmation',
];
export function Booking() {
  const services = useServices(),
    barbers = useBarbers(),
    business = useBusiness();
  const [step, setStep] = useState(0),
    [serviceId, setServiceId] = useState(''),
    [barberId, setBarberId] = useState('any'),
    [date, setDate] = useState(() => localDate()),
    [startsAt, setStartsAt] = useState('');
  const [confirmed, setConfirmed] = useState<Appointment | null>(null),
    [message, setMessage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null),
    submitting = useRef(false);
  const client = useQueryClient();
  const [now] = useState(() => Date.now());
  const submission = useRef<{ payload: string; key: string } | null>(null);
  const form = useForm<Customer>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: '', email: '', phone: '' },
  });
  const availability = useQuery({
    queryKey: ['availability', serviceId, barberId, date],
    queryFn: () =>
      request(
        `/availability?serviceId=${encodeURIComponent(serviceId)}&barberId=${encodeURIComponent(barberId)}&date=${date}`,
        availabilitySchema,
      ),
    enabled: !!serviceId && step >= 2 && !confirmed,
    retry: 1,
    staleTime: 0,
  });
  const service = services.data?.services.find((item) => item.id === serviceId);
  const eligible =
    barbers.data?.barbers.filter((item) =>
      item.supportedServiceIds.includes(serviceId),
    ) ?? [];
  const next = (target: number) => {
    setStep(target);
    setMessage('');
  };
  const lastStage = useRef(step);
  useEffect(() => {
    if (lastStage.current !== step) {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
      lastStage.current = step;
    }
  }, [step]);
  const mutation = useMutation({
    mutationFn: async () => {
      const values = form.getValues();
      const payload = JSON.stringify({
        serviceId,
        barberId,
        startsAt,
        customer: {
          name: values.name,
          email: values.email,
          ...(values.phone.trim() ? { phone: values.phone } : {}),
        },
      });
      if (submission.current?.payload !== payload)
        submission.current = { payload, key: crypto.randomUUID() };
      return request(
        '/appointments',
        z.object({ appointment: appointmentSchema }),
        {
          method: 'POST',
          headers: { 'Idempotency-Key': submission.current.key },
          body: payload,
        },
      );
    },
    onSuccess: (result) => {
      setConfirmed(result.appointment);
      form.reset();
      void client.invalidateQueries({ queryKey: ['availability'] });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'SLOT_CONFLICT') {
        setMessage(
          'That time was just taken. Please choose a refreshed available time.',
        );
        setStartsAt('');
        setStep(2);
        void availability.refetch();
      } else setMessage(error.message);
    },
    onSettled: () => {
      submitting.current = false;
    },
  });
  const submit = () => {
    if (submitting.current || mutation.isPending || confirmed) return;
    submitting.current = true;
    mutation.mutate();
  };
  if (confirmed) return <Confirmation appointment={confirmed} />;
  const earliest = localDate(
    new Date(now + (business.data?.leadMinutes ?? 60) * 60000),
  );
  const latest = localDate(
    new Date(now + (business.data?.horizonDays ?? 60) * 86400000),
  );
  return (
    <section
      className="booking-page py-section"
      aria-labelledby="booking-title"
    >
      <p className="type-label text-accent mb-4">
        Studio North / Fictional booking
      </p>
      <h1 ref={heading} tabIndex={-1} id="booking-title" className="type-title">
        Make a little time.
      </h1>
      <p className="type-body text-secondary mt-4">
        A fictional demo only. Do not enter sensitive or real personal
        information. No real appointment or notification will be provided.
      </p>
      <p className="type-caption text-secondary mt-3">
        All times are Portland local time — America/Los_Angeles.
      </p>
      {business.data?.demoMode && (
        <p className="type-caption mt-3">
          Contact details are replaced with synthetic demo values on the server.
        </p>
      )}
      <ol className="booking-steps mt-8" aria-label="Booking progress">
        {steps.map((label, index) => (
          <li key={label} aria-current={index === step ? 'step' : undefined}>
            <span>{index + 1}</span> {label}
          </li>
        ))}
      </ol>
      <QueryMessage
        pending={services.isPending || barbers.isPending || business.isPending}
        error={services.error || barbers.error || business.error}
        onRetry={() => {
          void services.refetch();
          void barbers.refetch();
          void business.refetch();
        }}
      />
      {services.data && barbers.data && business.data && (
        <div className="booking-content mt-8">
          {step === 0 && (
            <fieldset>
              <legend className="type-subtitle mb-6">
                Choose your service
              </legend>
              <div className="choice-grid">
                {services.data.services.map((item) => (
                  <label className="choice" key={item.id}>
                    <input
                      type="radio"
                      name="service"
                      value={item.id}
                      checked={serviceId === item.id}
                      onChange={() => {
                        setServiceId(item.id);
                        setBarberId('any');
                        setStartsAt('');
                      }}
                    />
                    <span>
                      <strong>{item.name}</strong>
                      <span className="choice-detail">
                        {item.durationMinutes} min · {money(item.priceCents)}
                      </span>
                      <span className="choice-detail text-secondary">
                        {item.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {!services.data.services.length && (
                <p>No services are currently available.</p>
              )}
            </fieldset>
          )}
          {step === 1 && (
            <fieldset>
              <legend className="type-subtitle mb-6">Choose your barber</legend>
              <div className="choice-grid">
                <label className="choice">
                  <input
                    type="radio"
                    name="barber"
                    checked={barberId === 'any'}
                    onChange={() => {
                      setBarberId('any');
                      setStartsAt('');
                    }}
                  />
                  <span>
                    <strong>Any Available</strong>
                    <span className="choice-detail text-secondary">
                      The server assigns an eligible barber for your chosen
                      time.
                    </span>
                  </span>
                </label>
                {eligible.map((item) => (
                  <label className="choice" key={item.id}>
                    <input
                      type="radio"
                      name="barber"
                      checked={barberId === item.id}
                      onChange={() => {
                        setBarberId(item.id);
                        setStartsAt('');
                      }}
                    />
                    <span>
                      <strong>{item.name}</strong>
                      <span className="choice-detail text-secondary">
                        {item.specialty}
                      </span>
                    </span>
                  </label>
                ))}
                {!eligible.length && (
                  <p role="status">
                    No barbers currently support this service. Go back and
                    choose another service.
                  </p>
                )}
              </div>
            </fieldset>
          )}
          {step === 2 && (
            <>
              <label className="field">
                Date
                <input
                  type="date"
                  min={earliest}
                  max={latest}
                  value={date}
                  onChange={(event) => {
                    setDate(event.target.value);
                    setStartsAt('');
                  }}
                />
              </label>
              <QueryMessage
                pending={availability.isPending || availability.isFetching}
                error={availability.error}
                onRetry={() => {
                  void availability.refetch();
                }}
              />
              {availability.data && !availability.isFetching && (
                <fieldset className="mt-6">
                  <legend className="type-subtitle mb-4">
                    Available times
                  </legend>
                  <div className="slot-grid">
                    {availability.data.slots.map((slot) => (
                      <label className="slot" key={slot.startsAt}>
                        <input
                          type="radio"
                          name="time"
                          checked={startsAt === slot.startsAt}
                          onChange={() => setStartsAt(slot.startsAt)}
                        />
                        <span>
                          {new Intl.DateTimeFormat('en-US', {
                            timeZone: 'America/Los_Angeles',
                            hour: 'numeric',
                            minute: '2-digit',
                            timeZoneName: 'short',
                          }).format(new Date(slot.startsAt))}
                        </span>
                      </label>
                    ))}
                  </div>
                  {!availability.data.slots.length && (
                    <p role="status">
                      No times available on this date. Try another date or Any
                      Available.
                    </p>
                  )}
                </fieldset>
              )}
            </>
          )}
          {step === 3 && (
            <form
              id="customer-form"
              onSubmit={form.handleSubmit(() => next(4))}
              noValidate
            >
              <h2 className="type-subtitle mb-6">Demo contact details</h2>
              {(['name', 'email', 'phone'] as const).map((key) => (
                <label key={key} className="field">
                  {key === 'name'
                    ? 'Name'
                    : key === 'email'
                      ? 'Email'
                      : 'Phone (optional)'}
                  <input
                    type={
                      key === 'email'
                        ? 'email'
                        : key === 'phone'
                          ? 'tel'
                          : 'text'
                    }
                    aria-label={
                      key === 'name'
                        ? 'Name'
                        : key === 'email'
                          ? 'Email'
                          : 'Phone (optional)'
                    }
                    autoComplete="off"
                    {...form.register(key)}
                    aria-invalid={!!form.formState.errors[key]}
                    aria-describedby={
                      form.formState.errors[key] ? `${key}-error` : undefined
                    }
                  />
                  {form.formState.errors[key] && (
                    <span
                      id={`${key}-error`}
                      role="alert"
                      className="field-error"
                    >
                      {form.formState.errors[key]?.message}
                    </span>
                  )}
                </label>
              ))}
            </form>
          )}
          {step === 4 && (
            <>
              <h2 className="type-subtitle mb-6">Review your demo booking</h2>
              <dl className="review-list">
                <dt>Service</dt>
                <dd>
                  {service?.name} · {service?.durationMinutes} min ·{' '}
                  {money(service?.priceCents ?? 0)}
                </dd>
                <dt>Barber</dt>
                <dd>
                  {barberId === 'any'
                    ? 'Any Available'
                    : eligible.find((item) => item.id === barberId)?.name}
                </dd>
                <dt>Date & time</dt>
                <dd>{appointmentTime(startsAt)} · Pacific time</dd>
                <dt>Demo name</dt>
                <dd>{form.getValues('name')}</dd>
                <dt>Demo email</dt>
                <dd>{form.getValues('email')}</dd>
              </dl>
              <p className="type-caption mt-6 text-secondary">
                Submitting saves a fictional appointment. No real service or
                message is provided.
              </p>
            </>
          )}
          {message && (
            <p role="alert" className="notice mt-6">
              {message}
            </p>
          )}
          <div className="form-actions mt-8">
            {step > 0 && (
              <button
                type="button"
                className="button"
                data-variant="secondary"
                disabled={mutation.isPending}
                onClick={() => next(step - 1)}
              >
                Back
              </button>
            )}
            {step < 4 ? (
              <button
                key={step}
                type={step === 3 ? 'submit' : 'button'}
                form={step === 3 ? 'customer-form' : undefined}
                className="button"
                data-variant="primary"
                disabled={
                  (step === 0 && !serviceId) ||
                  (step === 1 && !eligible.length) ||
                  (step === 2 && (!startsAt || availability.isFetching))
                }
                onClick={step === 3 ? undefined : () => next(step + 1)}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                className="button"
                data-variant="primary"
                disabled={mutation.isPending}
                onClick={submit}
              >
                {mutation.isPending ? 'Saving…' : 'Confirm demo booking'}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
function Confirmation({ appointment }: { appointment: Appointment }) {
  return (
    <section className="booking-page py-section">
      <p className="type-label text-accent">
        Fictional demo / Saved by the server
      </p>
      <h1 className="type-title mt-4">Your demo booking is saved.</h1>
      <p className="type-body text-secondary mt-4">
        No real appointment has been made. No email or SMS will be sent.
      </p>
      <dl className="review-list mt-8">
        <dt>Reference</dt>
        <dd className="break-all">{appointment.reference}</dd>
        <dt>Service</dt>
        <dd>
          {appointment.serviceName} · {money(appointment.priceCents)}
        </dd>
        <dt>Barber</dt>
        <dd>
          <BarberName id={appointment.barberId} />
        </dd>
        <dt>Time</dt>
        <dd>{appointmentTime(appointment.startsAt)} · America/Los_Angeles</dd>
        <dt>Status</dt>
        <dd>{appointment.status}</dd>
      </dl>
      <Link
        className="text-link inline-flex min-h-11 mt-6"
        to={`/book/confirmation/${appointment.reference}`}
      >
        View confirmation reference
      </Link>
    </section>
  );
}
function BarberName({ id }: { id: string }) {
  const barbers = useBarbers();
  return (
    <>{barbers.data?.barbers.find((barber) => barber.id === id)?.name ?? id}</>
  );
}
export function BookingConfirmation() {
  const { reference } = useParams();
  const query = useQuery({
    queryKey: ['confirmation', reference],
    queryFn: () =>
      request(
        `/appointments/${encodeURIComponent(reference ?? '')}`,
        z.object({ appointment: appointmentSchema }),
      ),
    retry: false,
  });
  return query.data ? (
    <Confirmation appointment={query.data.appointment} />
  ) : (
    <section className="py-section">
      <h1 className="type-title">Demo confirmation</h1>
      <QueryMessage
        pending={query.isPending}
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
      />
    </section>
  );
}
