import { z } from 'zod';

const schema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    DEMO_MODE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    DEMO_DATABASE: z
      .string()
      .regex(/^studio_north_demo_[a-z0-9_]{1,12}$/)
      .optional(),
    SESSION_MINUTES: z.coerce.number().int().min(1).max(480).default(60),
    SESSION_COOKIE_SECURE: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) =>
        value === undefined ? undefined : value === 'true',
      ),
    BOOKING_LEAD_MINUTES: z.coerce.number().int().min(0).max(10080).default(60),
    BOOKING_HORIZON_DAYS: z.coerce.number().int().min(1).max(365).default(60),
    BOOKING_RATE_LIMIT_MAX: z.coerce
      .number()
      .int()
      .min(1)
      .max(1000)
      .default(10),
    PORT: z.coerce.number().int().min(1).max(65535),
    MONGODB_URI: z
      .string()
      .trim()
      .regex(/^mongodb(?:\+srv)?:\/\/\S+$/, 'Must be a MongoDB connection URI'),
    CLIENT_ORIGIN: z.url().refine((value) => {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && url.origin === value;
    }, 'Must be an HTTP(S) origin without a path or trailing slash'),
    BUSINESS_TIMEZONE: z
      .string()
      .default('America/Los_Angeles')
      .refine((value) => {
        try {
          new Intl.DateTimeFormat('en', { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, 'Must be a valid IANA timezone'),
  })
  .refine((value) => !value.DEMO_MODE || Boolean(value.DEMO_DATABASE), {
    message: 'DEMO_DATABASE is required in demo mode',
    path: ['DEMO_DATABASE'],
  })
  .refine(
    (value) =>
      value.NODE_ENV !== 'production' || value.SESSION_COOKIE_SECURE !== false,
    {
      message: 'Production session cookies must be Secure',
      path: ['SESSION_COOKIE_SECURE'],
    },
  )
  .transform((value) => ({
    ...value,
    SESSION_COOKIE_SECURE:
      value.SESSION_COOKIE_SECURE ?? value.NODE_ENV === 'production',
  }));

export function parseEnv(input: NodeJS.ProcessEnv) {
  const result = schema.safeParse(input);
  if (!result.success) {
    // Report field names and validation reasons, never supplied values or credentials.
    throw new Error(
      `Invalid environment: ${result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`,
    );
  }
  return result.data;
}
