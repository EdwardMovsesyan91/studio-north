import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';

export const serviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  durationMinutes: z.number(),
  priceCents: z.number(),
  isActive: z.boolean(),
  displayOrder: z.number(),
});
export const barberSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  title: z.string(),
  biography: z.string(),
  specialty: z.string(),
  portrait: z.string().nullable(),
  supportedServiceIds: z.array(z.string()),
  isActive: z.boolean(),
});
export type Service = z.infer<typeof serviceSchema>;
export type Barber = z.infer<typeof barberSchema>;
export const profileDisclosure =
  'Fictional sample identities for this portfolio demo. Stock portraits do not depict Studio North employees or imply endorsement.';
export const businessSchema = z.object({
  timezone: z.string(),
  currency: z.string(),
  demoMode: z.boolean(),
  leadMinutes: z.number(),
  horizonDays: z.number(),
  hours: z.array(
    z.object({
      day: z.number(),
      periods: z.array(z.object({ opens: z.number(), closes: z.number() })),
    }),
  ),
});
export const availabilitySchema = z.object({
  timezone: z.string(),
  slots: z.array(
    z.object({
      startsAt: z.string(),
      endsAt: z.string(),
      localTime: z.number(),
      barbers: z.array(z.object({ id: z.string(), name: z.string() })),
    }),
  ),
  emptyReason: z.string().nullable(),
});
export const appointmentSchema = z.object({
  reference: z.string(),
  serviceId: z.string(),
  barberId: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
  serviceName: z.string(),
  priceCents: z.number(),
  currency: z.string(),
  fictionalDemo: z.boolean(),
});
export type Appointment = z.infer<typeof appointmentSchema>;
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
) {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Could not reach Studio North. Please try again.',
    );
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = z
      .object({ error: z.object({ code: z.string(), message: z.string() }) })
      .safeParse(body);
    throw new ApiError(
      response.status,
      error.success ? error.data.error.code : 'API_ERROR',
      error.success
        ? error.data.error.message
        : 'The request could not be completed.',
    );
  }
  return schema.parse(body);
}
export const useServices = () =>
  useQuery({
    queryKey: ['services'],
    queryFn: () =>
      request('/services', z.object({ services: z.array(serviceSchema) })),
    staleTime: 30000,
    retry: 1,
  });
export const useBarbers = () =>
  useQuery({
    queryKey: ['barbers'],
    queryFn: () =>
      request('/barbers', z.object({ barbers: z.array(barberSchema) })),
    staleTime: 30000,
    retry: 1,
  });
export const useBusiness = () =>
  useQuery({
    queryKey: ['business'],
    queryFn: () => request('/business', businessSchema),
    staleTime: 30000,
    retry: 1,
  });
export const money = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);
export const appointmentTime = (instant: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(instant));
export const localDate = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
