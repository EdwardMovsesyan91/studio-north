import { z } from 'zod';
import { request } from '../../api';
export const sessionSchema = z.object({
  authenticated: z.literal(true),
  scope: z.enum(['owner', 'demo']),
  csrf: z.string(),
  expiresAt: z.string(),
});
export type Session = z.infer<typeof sessionSchema>;
export const adminServiceSchema = z.object({
  _id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  durationMinutes: z.number(),
  priceCents: z.number(),
  isActive: z.boolean(),
  displayOrder: z.number(),
});
export const adminBarberSchema = z.object({
  _id: z.string(),
  name: z.string(),
  slug: z.string(),
  title: z.string(),
  biography: z.string(),
  specialty: z.string(),
  portrait: z.string().nullable(),
  supportedServiceIds: z.array(z.string()),
  isActive: z.boolean(),
});
export const adminAppointmentSchema = z.object({
  reference: z.string(),
  serviceId: z.string(),
  barberId: z.string(),
  customerName: z.string(),
  customerEmail: z.string(),
  customerPhone: z.string().optional(),
  startsAt: z.string(),
  endsAt: z.string(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
  serviceNameSnapshot: z.string(),
  priceCentsSnapshot: z.number(),
});
export const scheduleSchema = z.object({
  _id: z.string(),
  kind: z.enum(['business', 'barber']),
  barberId: z.string().nullable(),
  timezone: z.string(),
  hours: z.array(
    z.object({
      day: z.number(),
      periods: z.array(z.object({ opens: z.number(), closes: z.number() })),
    }),
  ),
  timeOff: z.array(z.object({ startsAt: z.string(), endsAt: z.string() })),
});
export const write = (
  path: string,
  body: unknown,
  session: Session,
  method = 'POST',
) =>
  request(`/admin${path}`, z.unknown(), {
    method,
    headers: { 'X-CSRF-Token': session.csrf },
    body: JSON.stringify(body),
  });
