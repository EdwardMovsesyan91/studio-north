import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { money, request } from '../../api';
import { QueryMessage } from '../../components/QueryMessage';
import { adminServiceSchema, adminBarberSchema, write } from './contracts';
import type { Session } from './contracts';
const serviceForm = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().trim().min(1).max(1000),
  durationMinutes: z.number().int().min(15).max(480).multipleOf(15),
  price: z.number().min(0).max(10000),
  isActive: z.boolean(),
  displayOrder: z.number().int().min(0).max(10000),
});
type ServiceValues = z.infer<typeof serviceForm>;
const barberForm = z.object({
  name: z.string().trim().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(1),
  biography: z.string().trim().min(1),
  specialty: z.string().trim().min(1),
  portrait: z.string(),
  supportedServiceIds: z
    .array(z.string())
    .min(1, 'Select at least one supported service.'),
  isActive: z.boolean(),
});
type BarberValues = z.infer<typeof barberForm>;
export function ServiceManagement({ session }: { session: Session }) {
  const [editing, setEditing] = useState<string | null>(null);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'services'],
    queryFn: () =>
      request(
        '/admin/services',
        z.object({ services: z.array(adminServiceSchema) }),
      ),
  });
  const form = useForm<ServiceValues>({
    resolver: zodResolver(serviceForm),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      durationMinutes: 45,
      price: 45,
      isActive: true,
      displayOrder: 0,
    },
  });
  const mutation = useMutation({
    mutationFn: (values: ServiceValues) => {
      const { price, ...rest } = values;
      return write(
        editing && editing !== 'new' ? `/services/${editing}` : '/services',
        { ...rest, priceCents: Math.round(price * 100) },
        session,
        editing && editing !== 'new' ? 'PUT' : 'POST',
      );
    },
    onSuccess: () => {
      setEditing(null);
      void client.invalidateQueries({ queryKey: ['admin'] });
      void client.invalidateQueries({ queryKey: ['services'] });
      void client.invalidateQueries({ queryKey: ['availability'] });
    },
  });
  return (
    <section className="admin-page">
      <h1 className="type-title">Services.</h1>
      <p className="type-body text-secondary mt-4">
        Catalog edits affect future bookings. Existing appointment price and
        name snapshots remain unchanged.
      </p>
      <button
        type="button"
        className="button mt-6"
        data-variant="primary"
        onClick={() => {
          setEditing('new');
          mutation.reset();
          form.reset({
            name: '',
            slug: '',
            description: '',
            durationMinutes: 45,
            price: 45,
            isActive: true,
            displayOrder: 0,
          });
        }}
      >
        Create service
      </button>
      <QueryMessage
        pending={query.isPending}
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
      />
      <ul className="admin-records">
        {query.data?.services.map((service) => (
          <li key={service._id}>
            <div>
              <strong>{service.name}</strong>
              <p className="type-caption text-secondary">
                {service.durationMinutes} min · {money(service.priceCents)} ·{' '}
                {service.isActive ? 'Active' : 'Inactive'}
              </p>
            </div>
            <button
              className="button"
              data-variant="secondary"
              type="button"
              onClick={() => {
                setEditing(service._id);
                mutation.reset();
                form.reset({
                  name: service.name,
                  slug: service.slug,
                  description: service.description,
                  durationMinutes: service.durationMinutes,
                  price: service.priceCents / 100,
                  isActive: service.isActive,
                  displayOrder: service.displayOrder,
                });
              }}
            >
              Edit {service.name}
            </button>
          </li>
        ))}
      </ul>
      {editing && (
        <form
          className="admin-detail mt-8"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          noValidate
        >
          <h2 className="type-subtitle mb-6">
            {editing === 'new' ? 'New service' : 'Edit service'}
          </h2>
          {(
            [
              'name',
              'slug',
              'description',
              'durationMinutes',
              'price',
              'displayOrder',
            ] as const
          ).map((key) => (
            <label key={key} className="field">
              {
                {
                  name: 'Name',
                  slug: 'URL slug',
                  description: 'Description',
                  durationMinutes: 'Duration (minutes, multiples of 15)',
                  price: 'Price (USD)',
                  displayOrder: 'Display order',
                }[key]
              }
              {key === 'description' ? (
                <textarea {...form.register(key)} rows={4} />
              ) : (
                <input
                  type={
                    ['durationMinutes', 'price', 'displayOrder'].includes(key)
                      ? 'number'
                      : 'text'
                  }
                  step={
                    key === 'price'
                      ? '0.01'
                      : key === 'durationMinutes'
                        ? '15'
                        : undefined
                  }
                  {...form.register(
                    key,
                    ['durationMinutes', 'price', 'displayOrder'].includes(key)
                      ? { valueAsNumber: true }
                      : {},
                  )}
                  aria-invalid={!!form.formState.errors[key]}
                />
              )}
              <span role={form.formState.errors[key] ? 'alert' : undefined}>
                {form.formState.errors[key]?.message}
              </span>
            </label>
          ))}
          <label className="check-field">
            <input type="checkbox" {...form.register('isActive')} /> Available
            for new bookings
          </label>
          <div className="form-actions mt-6">
            <button
              className="button"
              data-variant="primary"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Saving…' : 'Save service'}
            </button>
            <button
              type="button"
              className="button"
              data-variant="secondary"
              onClick={() => setEditing(null)}
            >
              Cancel editing
            </button>
          </div>
          {mutation.error && <p role="alert">{mutation.error.message}</p>}
        </form>
      )}
      {mutation.isSuccess && <p role="status">Service saved.</p>}
    </section>
  );
}
export function BarberManagement({ session }: { session: Session }) {
  const [editing, setEditing] = useState<string | null>(null);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'barbers'],
    queryFn: () =>
      request(
        '/admin/barbers',
        z.object({ barbers: z.array(adminBarberSchema) }),
      ),
  });
  const services = useQuery({
    queryKey: ['admin', 'services'],
    queryFn: () =>
      request(
        '/admin/services',
        z.object({ services: z.array(adminServiceSchema) }),
      ),
  });
  const form = useForm<BarberValues>({ resolver: zodResolver(barberForm) });
  const mutation = useMutation({
    mutationFn: (values: BarberValues) =>
      write(
        `/barbers/${editing}`,
        { ...values, portrait: values.portrait || null },
        session,
        'PUT',
      ),
    onSuccess: () => {
      setEditing(null);
      void client.invalidateQueries({ queryKey: ['admin'] });
      void client.invalidateQueries({ queryKey: ['barbers'] });
      void client.invalidateQueries({ queryKey: ['availability'] });
    },
  });
  return (
    <section className="admin-page">
      <h1 className="type-title">The barbers.</h1>
      <p className="type-body text-secondary mt-4">
        Manage fictional profiles and service eligibility. Inactive barbers
        cannot receive new bookings.
      </p>
      <QueryMessage
        pending={query.isPending || services.isPending}
        error={query.error || services.error}
        onRetry={() => {
          void query.refetch();
          void services.refetch();
        }}
      />
      <ul className="admin-records">
        {query.data?.barbers.map((barber) => (
          <li key={barber._id}>
            <div>
              <strong>{barber.name}</strong>
              <p className="type-caption text-secondary">
                {barber.title} · {barber.isActive ? 'Active' : 'Inactive'}
              </p>
            </div>
            <button
              type="button"
              className="button"
              data-variant="secondary"
              onClick={() => {
                setEditing(barber._id);
                mutation.reset();
                form.reset({ ...barber, portrait: barber.portrait ?? '' });
              }}
            >
              Edit {barber.name}
            </button>
          </li>
        ))}
      </ul>
      {editing && (
        <form
          className="admin-detail mt-8"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          noValidate
        >
          <h2 className="type-subtitle mb-6">Edit profile</h2>
          {(['name', 'slug', 'title', 'biography', 'specialty'] as const).map(
            (key) => (
              <label className="field" key={key}>
                {
                  {
                    name: 'Name',
                    slug: 'URL slug',
                    title: 'Title',
                    biography: 'Biography',
                    specialty: 'Specialty',
                  }[key]
                }
                {key === 'biography' ? (
                  <textarea {...form.register(key)} rows={5} />
                ) : (
                  <input {...form.register(key)} />
                )}
                <span role={form.formState.errors[key] ? 'alert' : undefined}>
                  {form.formState.errors[key]?.message}
                </span>
              </label>
            ),
          )}
          <label className="field">
            Licensed sample portrait
            <select {...form.register('portrait')}>
              <option value="">No portrait</option>
              <option value="/images/portrait-verfe-800.webp">
                Portrait study 1
              </option>
              <option value="/images/portrait-rdne-800.webp">
                Portrait study 2
              </option>
              <option value="/images/portrait-cottonbro-800.webp">
                Portrait study 3
              </option>
            </select>
          </label>
          <fieldset className="mt-6">
            <legend>Supported services</legend>
            {services.data?.services.map((service) => (
              <label className="check-field" key={service._id}>
                <input
                  type="checkbox"
                  value={service._id}
                  {...form.register('supportedServiceIds')}
                />
                {service.name}
              </label>
            ))}
            {form.formState.errors.supportedServiceIds && (
              <p role="alert">
                {form.formState.errors.supportedServiceIds.message}
              </p>
            )}
          </fieldset>
          <label className="check-field mt-6">
            <input type="checkbox" {...form.register('isActive')} /> Available
            for new bookings
          </label>
          <div className="form-actions mt-6">
            <button
              className="button"
              data-variant="primary"
              disabled={mutation.isPending}
            >
              Save profile
            </button>
            <button
              type="button"
              className="button"
              data-variant="secondary"
              onClick={() => setEditing(null)}
            >
              Cancel editing
            </button>
          </div>
          {mutation.error && <p role="alert">{mutation.error.message}</p>}
        </form>
      )}
      {mutation.isSuccess && <p role="status">Profile saved.</p>}
    </section>
  );
}
