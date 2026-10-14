import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { createApp } from '../../dist/app.js';
import { defaultPolicy } from '../../dist/booking/scheduling.js';
import {
  Appointment,
  BookingRateLimit,
  BookingState,
  OccupancyBlock,
  Service,
  WorkingSchedule,
  ensureBookingIndexes,
} from '../../dist/booking/models.js';
import {
  AdminUser,
  AdminSession,
  ensureAdminIndexes,
} from '../../dist/admin/models.js';
import { designateDemo, resetDemo } from '../../dist/admin/demo.js';
import {
  createAppointment,
  getAvailability,
} from '../../dist/booking/service.js';
import { serviceSeeds } from '../../dist/booking/seed-data.js';
import { saveSchedule } from '../../dist/admin/management.js';
const uri = process.env.MONGODB_TEST_URI ?? process.env.MONGODB_URI;
const origin = 'http://127.0.0.1:5173';
const options = {
  origin,
  secureCookies: false,
  sessionMinutes: 30,
  demoMode: true,
};
test(
  'admin/session/demo/management real database integration',
  { skip: !uri ? 'MongoDB URI unavailable' : false, timeout: 240000 },
  async (t) => {
    const database = `studio_north_demo_${randomBytes(6).toString('hex')}`;
    let server;
    t.after(async () => {
      if (server)
        await new Promise((resolve) => {
          server.close(resolve);
          server.closeIdleConnections();
        });
      try {
        if (
          mongoose.connection.name === database &&
          /^studio_north_demo_[a-f0-9]{12}$/.test(database)
        )
          await mongoose.connection.dropDatabase();
      } finally {
        await mongoose.disconnect();
      }
    });
    try {
      await mongoose.connect(uri, {
        dbName: database,
        serverSelectionTimeoutMS: 5000,
      });
    } catch {
      throw new Error('Integration MongoDB unavailable');
    }
    await ensureBookingIndexes();
    await ensureAdminIndexes();
    await t.test(
      'demo startup refuses an uninitialized database before listening',
      async () => {
        const child = spawn(
          process.execPath,
          [fileURLToPath(new URL('../../dist/index.js', import.meta.url))],
          {
            env: {
              ...process.env,
              PORT: '3019',
              CLIENT_ORIGIN: origin,
              DEMO_MODE: 'true',
              DEMO_DATABASE: database,
              MONGODB_URI: uri,
            },
            stdio: ['ignore', 'pipe', 'pipe'],
          },
        );
        let output = '';
        child.stdout.on('data', (chunk) => {
          output += chunk;
        });
        child.stderr.on('data', (chunk) => {
          output += chunk;
        });
        const [code] = await once(child, 'exit');
        assert.equal(code, 1);
        assert.match(output, /Demo database is not initialized/);
        assert(!output.includes('listening on port'));
      },
    );
    async function operator(entry, variables) {
      const child = spawn(
        process.execPath,
        [fileURLToPath(new URL(`../../dist/${entry}.js`, import.meta.url))],
        {
          env: {
            ...process.env,
            PORT: '3019',
            CLIENT_ORIGIN: origin,
            MONGODB_URI: uri,
            DEMO_MODE: 'true',
            DEMO_DATABASE: database,
            ...variables,
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
      let output = '';
      child.stdout.on('data', (chunk) => {
        output += chunk;
      });
      child.stderr.on('data', (chunk) => {
        output += chunk;
      });
      const [code] = await once(child, 'exit');
      return { code, output };
    }
    await t.test(
      'operator demo reset requires explicit confirmation and initializes only designated data',
      async () => {
        assert.equal(
          (await operator('demo-reset', { DEMO_RESET_CONFIRM: 'wrong' })).code,
          1,
        );
        assert.equal(
          (await BookingState.findById('booking')).demoDesignated,
          false,
        );
        const reset = await operator('demo-reset', {
          DEMO_RESET_CONFIRM: 'RESET DEMO',
        });
        assert.equal(reset.code, 0, reset.output);
        assert.equal(
          (await BookingState.findById('booking')).demoDesignated,
          true,
        );
        assert.equal(await Appointment.countDocuments(), 3);
      },
    );
    await t.test(
      'operator admin setup hashes initial credentials and preserves existing credentials on rerun',
      async () => {
        const setup = await operator('admin-setup', {
          ADMIN_EMAIL: 'admin@example.invalid',
          ADMIN_INITIAL_PASSWORD: 'Isolated-test-password-2026',
        });
        assert.equal(setup.code, 0, setup.output);
        const initial = await AdminUser.findById('administrator').lean();
        assert.notEqual(initial.passwordHash, 'Isolated-test-password-2026');
        assert.equal(
          (
            await operator('admin-setup', {
              ADMIN_EMAIL: 'changed@example.invalid',
              ADMIN_INITIAL_PASSWORD: 'Different-test-password-2026',
            })
          ).code,
          0,
        );
        assert.deepEqual(
          await AdminUser.findById('administrator').lean(),
          initial,
        );
      },
    );
    server = createApp({ ...defaultPolicy, rateLimitMax: 100 }, options).listen(
      0,
      '127.0.0.1',
    );
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    let cookie = '',
      csrf = '';
    const api = (path, body, method = 'POST', headers = {}) =>
      fetch(base + '/api/admin' + path, {
        method,
        headers: {
          Origin: origin,
          ...(cookie ? { Cookie: cookie } : {}),
          ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    const sessionFrom = async (response) => {
      assert.equal(response.status, 200);
      cookie = response.headers.get('set-cookie').split(';')[0];
      const session = await response.json();
      csrf = session.csrf;
      return session;
    };
    const json = async (path) => {
      const response = await api(path, undefined, 'GET');
      assert.equal(response.status, 200);
      return response.json();
    };
    await t.test(
      'unauthorized admin, login origin/rate limits, hashed credentials and cookie policy',
      async () => {
        assert.equal(
          (await api('/appointments', undefined, 'GET')).status,
          401,
        );
        assert.equal(
          (
            await api(
              '/login',
              { email: 'admin@example.invalid', password: 'bad' },
              'POST',
            )
          ).status,
          401,
        );
        assert.equal(
          (
            await api(
              '/login',
              { email: 'admin@example.invalid', password: 'bad' },
              'POST',
              { Origin: 'https://attacker.invalid' },
            )
          ).status,
          403,
        );
        const response = await api('/login', {
          email: 'admin@example.invalid',
          password: 'Isolated-test-password-2026',
        });
        const raw = response.headers.get('set-cookie');
        assert.match(raw, /HttpOnly/);
        assert.match(raw, /SameSite=Strict/);
        assert.match(raw, /Path=\/api\/admin/);
        assert.equal((await sessionFrom(response)).scope, 'owner');
        const stored = await AdminUser.findById('administrator');
        assert.notEqual(stored.passwordHash, 'Isolated-test-password-2026');
      },
    );
    await t.test(
      'CSRF rejection, expiration, logout and demo-login restriction',
      async () => {
        assert.equal(
          (
            await api('/reset', { confirmation: 'RESET DEMO' }, 'POST', {
              'X-CSRF-Token': 'wrong',
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await api('/logout', {}, 'POST', {
              Origin: 'https://attacker.invalid',
            })
          ).status,
          403,
        );
        const hash = createHash('sha256')
          .update(cookie.split('=')[1])
          .digest('hex');
        await AdminSession.updateOne(
          { _id: hash },
          { $set: { expiresAt: new Date(0) } },
        );
        assert.equal((await api('/session', undefined, 'GET')).status, 401);
        await sessionFrom(await api('/demo-login', {}));
        assert.equal((await json('/session')).scope, 'demo');
        const logout = await api('/logout', {});
        assert.equal(logout.status, 200);
        assert.match(logout.headers.get('set-cookie'), /Expires=/);
        assert.equal((await api('/session', undefined, 'GET')).status, 401);
        await sessionFrom(await api('/demo-login', {}));
      },
    );
    await t.test(
      'demo contacts synthetic, privacy lookup limited, retry idempotence and private admin read',
      async () => {
        const upcoming = await Appointment.findOne({ status: 'pending' });
        const date = upcoming.startsAt.toISOString().slice(0, 10);
        const available = await getAvailability(
          'classic-cut',
          'any',
          date,
          defaultPolicy,
        );
        const slot = available.slots.at(-1);
        const input = {
          serviceId: 'classic-cut',
          barberId: 'any',
          startsAt: slot.startsAt,
          customer: {
            name: 'Do not persist this',
            email: 'private@example.invalid',
            phone: '+15035550100',
          },
        };
        const headers = {
          'Content-Type': 'application/json',
          'Idempotency-Key': randomUUID(),
        };
        const post = () =>
          fetch(base + '/api/appointments', {
            method: 'POST',
            headers,
            body: JSON.stringify(input),
          });
        const first = await post();
        assert.equal(first.status, 201);
        const saved = (await first.json()).appointment;
        const second = await post();
        assert.equal(second.status, 201);
        assert.equal(
          (await second.json()).appointment.reference,
          saved.reference,
        );
        const stored = await Appointment.findOne({
          reference: saved.reference,
        });
        assert.equal(stored.customerName, 'Demo Visitor');
        assert.equal(stored.customerEmail, 'visitor@studio-north.invalid');
        assert(!stored.customerPhone);
        const lookup = await (
          await fetch(base + '/api/appointments/' + saved.reference)
        ).json();
        assert(!JSON.stringify(lookup).includes('customer'));
        assert(
          (await json('/appointments')).appointments.some(
            (appointment) => appointment.reference === saved.reference,
          ),
        );
      },
    );
    await t.test(
      'appointment status validation and transactional cancellation via authorized API',
      async () => {
        const appointment = await Appointment.findOne({ status: 'pending' });
        assert.equal(
          (
            await api(`/appointments/${appointment.reference}/status`, {
              status: 'completed',
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await api(`/appointments/${appointment.reference}/status`, {
              status: 'confirmed',
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await api(`/appointments/${appointment.reference}/status`, {
              status: 'cancelled',
            })
          ).status,
          200,
        );
        assert.equal(
          await OccupancyBlock.countDocuments({
            appointmentId: appointment._id,
          }),
          0,
        );
        assert.equal(
          (
            await api(`/appointments/${appointment.reference}/status`, {
              status: 'confirmed',
            })
          ).status,
          409,
        );
        const overview = await json('/overview');
        assert(overview.counts.cancelled >= 1);
        assert.equal(overview.revenueCents, 3000);
      },
    );
    await t.test(
      'service creation/edit/activation validation and historic snapshot preservation',
      async () => {
        const body = { ...serviceSeeds[0] };
        delete body._id;
        assert.equal(
          (
            await api('/services', {
              ...body,
              slug: 'bad-duration',
              durationMinutes: 46,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await api('/services', {
              ...body,
              slug: 'new-demo',
              name: 'New demo',
            })
          ).status,
          201,
        );
        assert.equal(
          (await api('/services', { ...body, slug: 'new-demo' })).status,
          409,
        );
        const completed = await Appointment.findOne({ status: 'completed' });
        const oldName = completed.serviceNameSnapshot;
        const existing = (await json('/services')).services.find(
          (service) => service._id === completed.serviceId,
        );
        const payload = {
          name: 'Edited future name',
          slug: existing.slug,
          description: existing.description,
          durationMinutes: existing.durationMinutes,
          priceCents: 9999,
          isActive: false,
          displayOrder: existing.displayOrder,
        };
        assert.equal(
          (await api(`/services/${existing._id}`, payload, 'PUT')).status,
          200,
        );
        assert.equal(
          (await Appointment.findById(completed._id)).serviceNameSnapshot,
          oldName,
        );
        assert.equal(
          (await Appointment.findById(completed._id)).priceCentsSnapshot,
          3000,
        );
        const catalog = await (await fetch(base + '/api/services')).json();
        assert(
          !catalog.services.some((service) => service.id === existing._id),
        );
      },
    );
    await t.test(
      'barber/profile/support restrictions, business bounds, overlap and active appointment protection',
      async () => {
        const barber = (await json('/barbers')).barbers.find(
          (barber) => barber._id === 'marcus-bennett',
        );
        const body = {
          name: barber.name,
          slug: barber.slug,
          title: barber.title,
          biography: barber.biography,
          specialty: barber.specialty,
          portrait: barber.portrait,
          supportedServiceIds: barber.supportedServiceIds,
          isActive: barber.isActive,
        };
        assert.equal(
          (
            await api(
              `/barbers/${barber._id}`,
              { ...body, supportedServiceIds: ['does-not-exist'] },
              'PUT',
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await api(
              `/barbers/${barber._id}`,
              { ...body, portrait: 'https://unlicensed.invalid/image' },
              'PUT',
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await api(
              `/barbers/${barber._id}`,
              { ...body, specialty: 'Edited demo specialty' },
              'PUT',
            )
          ).status,
          200,
        );
        const schedule = (await json('/schedules')).schedules.find(
          (schedule) => schedule.barberId === barber._id,
        );
        const shape = {
          timezone: schedule.timezone,
          hours: schedule.hours,
          timeOff: schedule.timeOff,
        };
        assert.equal(
          (
            await api(
              `/schedules/${barber._id}`,
              {
                ...shape,
                hours: shape.hours.map((day) => ({
                  ...day,
                  periods: [{ opens: 0, closes: 1440 }],
                })),
              },
              'PUT',
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await api(
              `/schedules/${barber._id}`,
              {
                ...shape,
                hours: shape.hours.map((day) => ({
                  ...day,
                  periods: [
                    { opens: 600, closes: 800 },
                    { opens: 700, closes: 900 },
                  ],
                })),
              },
              'PUT',
            )
          ).status,
          400,
        );
        const future = await Appointment.findOne({
          barberId: barber._id,
          status: 'confirmed',
        });
        const exception = {
          startsAt: future.startsAt.toISOString(),
          endsAt: future.endsAt.toISOString(),
        };
        assert.equal(
          (
            await api(
              `/schedules/${barber._id}`,
              { ...shape, timeOff: [exception] },
              'PUT',
            )
          ).status,
          409,
        );
        assert.equal(
          (await api(`/schedules/${barber._id}`, shape, 'PUT')).status,
          200,
        );
        const off = {
          startsAt: '2030-01-01T08:00:00Z',
          endsAt: '2030-01-02T08:00:00Z',
        };
        assert.equal(
          (
            await api(
              `/schedules/${barber._id}`,
              { ...shape, timeOff: [off] },
              'PUT',
            )
          ).status,
          200,
        );
      },
    );
    await t.test(
      'demo reset authorization, deterministic synthetic data, credential preservation and mutation gate',
      async () => {
        const before = await AdminUser.findById('administrator').lean();
        assert.equal(
          (await api('/reset', { confirmation: 'wrong' })).status,
          400,
        );
        assert.equal(
          (await api('/reset', { confirmation: 'RESET DEMO' })).status,
          200,
        );
        assert.equal(await Appointment.countDocuments(), 3);
        assert.equal(await Service.countDocuments(), 5);
        const refs = (
          await Appointment.find().sort({ reference: 1 }).lean()
        ).map((appointment) => appointment.reference);
        assert.equal(
          (await api('/reset', { confirmation: 'RESET DEMO' })).status,
          200,
        );
        assert.deepEqual(
          (await Appointment.find().sort({ reference: 1 }).lean()).map(
            (appointment) => appointment.reference,
          ),
          refs,
        );
        assert.deepEqual(
          await AdminUser.findById('administrator').lean(),
          before,
        );
        assert((await BookingState.findById('booking')).revision > 0);
        // Race a scheduling restriction against booking: at most one can persist.
        const seeded = await Appointment.findOne({ status: 'confirmed' });
        const date = seeded.startsAt.toISOString().slice(0, 10);
        const slots = await getAvailability(
          'classic-cut',
          'marcus-bennett',
          date,
          defaultPolicy,
        );
        const slot = slots.slots.at(-1);
        const schedule = await WorkingSchedule.findOne({
          barberId: 'marcus-bennett',
        }).lean();
        const proposed = {
          timezone: schedule.timezone,
          hours: schedule.hours,
          timeOff: [{ startsAt: slot.startsAt, endsAt: slot.endsAt }],
        };
        const input = {
          serviceId: 'classic-cut',
          barberId: 'marcus-bennett',
          startsAt: slot.startsAt,
          customer: { name: 'Synthetic test', email: 'test@example.invalid' },
        };
        const outcomes = await Promise.allSettled([
          createAppointment(input, defaultPolicy),
          saveSchedule('marcus-bennett', proposed),
        ]);
        assert.equal(
          outcomes.filter((outcome) => outcome.status === 'fulfilled').length,
          1,
        );
        const resetRaceSlots = await getAvailability(
          'classic-cut',
          'adrian-cole',
          date,
          defaultPolicy,
        );
        const resetRaceSlot = resetRaceSlots.slots.at(-1);
        await Promise.all([
          resetDemo(),
          createAppointment(
            {
              ...input,
              barberId: 'adrian-cole',
              startsAt: resetRaceSlot.startsAt,
            },
            defaultPolicy,
          ),
        ]);
        const appointmentsAfterRace = await Appointment.find().lean();
        assert([3, 4].includes(appointmentsAfterRace.length));
        const blocksAfterRace = await OccupancyBlock.find().lean();
        const appointmentIds = new Set(
          appointmentsAfterRace.map((appointment) => String(appointment._id)),
        );
        assert(
          blocksAfterRace.every((block) =>
            appointmentIds.has(String(block.appointmentId)),
          ),
        );
        for (const appointment of appointmentsAfterRace) {
          assert.equal(
            blocksAfterRace.filter(
              (block) =>
                String(block.appointmentId) === String(appointment._id),
            ).length,
            Math.ceil((appointment.endsAt - appointment.startsAt) / 900000),
          );
        }
      },
    );
    await t.test(
      'normal database cannot be designated or reset and login limiter is enforced',
      async () => {
        const other = mongoose.connection.name;
        Object.defineProperty(mongoose.connection, 'name', {
          value: 'studio_north',
          configurable: true,
        });
        try {
          await assert.rejects(resetDemo(), (error) => error.status === 403);
          await assert.rejects(
            designateDemo(),
            (error) => error.status === 403,
          );
        } finally {
          Object.defineProperty(mongoose.connection, 'name', {
            value: other,
            configurable: true,
          });
        }
        await BookingRateLimit.deleteMany({});
        for (let i = 0; i < 5; i++)
          assert.equal(
            (
              await api('/login', {
                email: 'admin@example.invalid',
                password: 'wrong',
              })
            ).status,
            401,
          );
        assert.equal(
          (
            await api('/login', {
              email: 'admin@example.invalid',
              password: 'wrong',
            })
          ).status,
          429,
        );
      },
    );
  },
);
