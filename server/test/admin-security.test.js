import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../dist/app.js';
import { parseEnv } from '../dist/env.js';
import {
  barberInput,
  scheduleInput,
  serviceInput,
} from '../dist/admin/management.js';

test('demo configuration is explicit and production cannot weaken secure cookies', () => {
  const env = {
    PORT: '3000',
    MONGODB_URI: 'mongodb://localhost/studio_north',
    CLIENT_ORIGIN: 'http://127.0.0.1:5173',
  };
  assert.equal(parseEnv(env).DEMO_MODE, false);
  assert.equal(
    parseEnv({ ...env, NODE_ENV: 'production' }).SESSION_COOKIE_SECURE,
    true,
  );
  assert.throws(
    () =>
      parseEnv({
        ...env,
        NODE_ENV: 'production',
        SESSION_COOKIE_SECURE: 'false',
      }),
    /SESSION_COOKIE_SECURE/,
  );
  for (const DEMO_DATABASE of [
    undefined,
    'studio_north',
    'arbitrary',
    'studio_north_demo_',
  ]) {
    assert.throws(
      () => parseEnv({ ...env, DEMO_MODE: 'true', DEMO_DATABASE }),
      /DEMO_DATABASE/,
    );
  }
  assert.equal(
    parseEnv({
      ...env,
      DEMO_MODE: 'true',
      DEMO_DATABASE: 'studio_north_demo_local',
    }).DEMO_MODE,
    true,
  );
});

test('admin public boundary rejects missing sessions, cross-origin login and disabled demo entry without DB', async (t) => {
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeIdleConnections();
      }),
  );
  const base = `http://127.0.0.1:${server.address().port}/api/admin`;
  for (const path of [
    '/session',
    '/appointments',
    '/overview',
    '/services',
    '/barbers',
    '/schedules',
  ]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  const post = (path, origin) =>
    fetch(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin },
      body: '{}',
    });
  assert.equal((await post('/login', 'https://attacker.invalid')).status, 403);
  assert.equal(
    (await post('/demo-login', 'http://127.0.0.1:5173')).status,
    403,
  );
  assert.equal((await post('/reset', 'http://127.0.0.1:5173')).status, 401);
});

test('catalog and schedule schemas reject unsupported fields, fractional prices and incompatible intervals', () => {
  const service = {
    name: 'Sample',
    slug: 'sample',
    description: 'Synthetic',
    durationMinutes: 45,
    priceCents: 4500,
    isActive: true,
    displayOrder: 0,
  };
  assert(serviceInput.safeParse(service).success);
  for (const invalid of [
    { ...service, durationMinutes: 46 },
    { ...service, priceCents: 1.5 },
    { ...service, password: 'extra' },
  ])
    assert(!serviceInput.safeParse(invalid).success);
  const barber = {
    name: 'Sample',
    slug: 'sample',
    title: 'Barber',
    biography: 'Fictional',
    specialty: 'Cuts',
    portrait: null,
    supportedServiceIds: ['sample'],
    isActive: true,
  };
  assert(barberInput.safeParse(barber).success);
  assert(
    !barberInput.safeParse({
      ...barber,
      supportedServiceIds: ['sample', 'sample'],
    }).success,
  );
  assert(
    !barberInput.safeParse({
      ...barber,
      portrait: 'https://unlicensed.invalid/image',
    }).success,
  );
  const schedule = {
    timezone: 'America/Los_Angeles',
    hours: Array.from({ length: 7 }, (_, day) => ({
      day,
      periods: [{ opens: 600, closes: 900 }],
    })),
    timeOff: [],
  };
  assert(scheduleInput.safeParse(schedule).success);
  assert(
    !scheduleInput.safeParse({
      ...schedule,
      hours: schedule.hours.map((d) => ({
        ...d,
        periods: [
          { opens: 600, closes: 800 },
          { opens: 700, closes: 900 },
        ],
      })),
    }).success,
  );
  assert(
    !scheduleInput.safeParse({
      ...schedule,
      hours: schedule.hours.map((d) => ({ ...d, day: 0 })),
    }).success,
  );
  assert(
    !scheduleInput.safeParse({
      ...schedule,
      timeOff: [
        { startsAt: '2030-01-02T08:00:00Z', endsAt: '2030-01-01T08:00:00Z' },
      ],
    }).success,
  );
});
