import assert from 'node:assert/strict';
import { once } from 'node:events';
import { fork } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import mongoose from 'mongoose';
import { createApp } from '../../dist/app.js';
import { Appointment, Barber, BookingRateLimit, OccupancyBlock, Service, WorkingSchedule, ensureBookingIndexes } from '../../dist/booking/models.js';
import { createAppointment, changeAppointmentStatus, getAvailability } from '../../dist/booking/service.js';
import { defaultPolicy, localParts } from '../../dist/booking/scheduling.js';
import { seedDevelopment } from '../../dist/booking/seed.js';

const uri = process.env.MONGODB_TEST_URI ?? process.env.MONGODB_URI;
test('real replica-set booking/API/transaction integration (isolated ephemeral database)', { skip: !uri ? 'No MongoDB test URI supplied' : false, timeout: 180000 }, async (t) => {
  const database = `studio_north_test_${randomBytes(8).toString('hex')}`;
  const workers = [];
  let server;
  t.after(async () => {
    if (server) await new Promise(resolve => { server.close(resolve); server.closeIdleConnections(); });
    for (const worker of workers) {
      worker.send('stop');
      const exit = once(worker, 'exit');
      const timer = setTimeout(() => worker.kill(), 5000);
      await exit; clearTimeout(timer);
    }
    // Never use dropDatabase on the URI's normal database or a configured name.
    try {
      if (mongoose.connection.name === database && /^studio_north_test_[a-f0-9]{16}$/.test(database)) await mongoose.connection.dropDatabase();
    } finally { await mongoose.disconnect(); }
  });
  try { await mongoose.connect(uri, { dbName: database, serverSelectionTimeoutMS: 5000 }); }
  catch { throw new Error('MongoDB integration connection failed; test not verified'); }
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  assert(hello.setName || hello.msg === 'isdbgrid', 'A replica set or compatible managed deployment is required');
  await ensureBookingIndexes();
  await seedDevelopment();
  const counts = async () => [await Service.countDocuments(), await Barber.countDocuments(), await WorkingSchedule.countDocuments(), await Appointment.countDocuments(), await OccupancyBlock.countDocuments()];
  const findDay = async (barberId, serviceId = 'classic-cut') => {
    for (let days = 2; days < 10; days++) {
      const date = localParts(new Date(Date.now() + days * 86400000), defaultPolicy.timezone).date;
      const result = await getAvailability(serviceId, barberId, date, defaultPolicy);
      if (result.slots.length >= 8) return result;
    }
    throw new Error('No test scheduling day found');
  };
  const initial = await findDay('adrian-cole');
  const body = (startsAt, barberId = 'adrian-cole', serviceId = 'classic-cut') => ({ serviceId, barberId, startsAt, customer: { name: '  Fictional Integration Test  ', email: '  TEST@EXAMPLE.INVALID  ', phone: '+1 (503) 555-0100' } });
  const normalized = input => ({ ...input, customer: { name: 'Fictional Integration Test', email: 'test@example.invalid', phone: '+15035550100' } });
  server = createApp({ ...defaultPolicy, rateLimitMax: 100 }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (url, input) => fetch(url + '/api/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });

  await t.test('declared indexes exist and repeated seed preserves edits and appointments', async () => {
    assert.deepEqual(await counts(), [5, 3, 4, 0, 0]);
    const indexes = await OccupancyBlock.collection.indexes();
    assert(indexes.some(index => index.name === 'unique_barber_slot' && index.unique && index.key.barberId === 1 && index.key.startsAt === 1));
    for (const model of [Service, Barber, WorkingSchedule, Appointment, BookingRateLimit]) assert((await model.collection.indexes()).length >= 2);
    await Service.updateOne({ _id: 'classic-cut' }, { $set: { description: 'Preserved development edit' } });
    await seedDevelopment();
    assert.equal((await Service.findById('classic-cut')).description, 'Preserved development edit');
    assert.deepEqual(await counts(), [5, 3, 4, 0, 0]);
  });
  await t.test('HTTP catalogs and availability are database-backed; booking normalizes and lookup hides personal details', async () => {
    const services = await (await fetch(base + '/api/services')).json();
    assert.equal(services.services.length, 5);
    assert.equal(services.services.find(s => s.id === 'classic-cut').priceCents, 4500);
    assert.equal(services.services.find(s => s.id === 'classic-cut').description, 'Preserved development edit');
    assert.equal((await (await fetch(base + '/api/barbers')).json()).barbers.length, 3);
    const availability = await fetch(`${base}/api/availability?serviceId=classic-cut&date=${initial.date}&barberId=adrian-cole`);
    assert.equal(availability.status, 200);
    const response = await post(base, body(initial.slots[0].startsAt));
    assert.equal(response.status, 201);
    const { appointment } = await response.json();
    assert.equal(appointment.status, 'pending');
    assert.equal(appointment.reference.length, 32);
    const stored = await Appointment.findOne({ reference: appointment.reference });
    assert.equal(stored.customerName, 'Fictional Integration Test');
    assert.equal(stored.customerEmail, 'test@example.invalid');
    assert.equal(stored.customerPhone, '+15035550100');
    assert.equal(await OccupancyBlock.countDocuments({ appointmentId: stored._id }), 3);
    const lookup = await fetch(`${base}/api/appointments/${appointment.reference}`);
    assert.equal(lookup.status, 200);
    const confirmation = await lookup.json();
    for (const field of ['customerName', 'customerEmail', 'customerPhone', '_id', 'createdAt', 'updatedAt']) assert(!Object.hasOwn(confirmation.appointment, field));
    assert(!JSON.stringify(confirmation).includes('example.invalid'));
    const before = await counts(); await seedDevelopment(); assert.deepEqual(await counts(), before);
    await Service.updateOne({ _id: 'classic-cut' }, { $set: { name: 'Temporary test name', priceCents: 9999 } });
    const snapshot = await (await fetch(`${base}/api/appointments/${appointment.reference}`)).json();
    assert.equal(snapshot.appointment.serviceName, 'Classic Cut');
    assert.equal(snapshot.appointment.priceCents, 4500);
    await Service.updateOne({ _id: 'classic-cut' }, { $set: { name: 'Classic Cut', priceCents: 4500 } });
  });
  await t.test('overlap rejected, adjacent allowed, failed creation rolls back partial reservations', async () => {
    const conflict = await post(base, body(initial.slots[1].startsAt));
    assert.equal(conflict.status, 409);
    const adjacent = await createAppointment(normalized(body(initial.slots[3].startsAt)), defaultPolicy);
    assert.equal(adjacent.startsAt, initial.slots[3].startsAt);
    const before = await counts();
    const invalid = normalized(body(initial.slots[7].startsAt));
    invalid.customer.name = 'x'.repeat(101); // Validation fails after block insertion.
    await assert.rejects(createAppointment(invalid, defaultPolicy));
    assert.deepEqual(await counts(), before, 'Transaction left neither orphan blocks nor an incomplete appointment');
    // Force a DB unique-index collision after the availability read, rather
    // than merely exercising the earlier overlap check.
    const insertBlocks = OccupancyBlock.insertMany;
    const fixtureId = new mongoose.Types.ObjectId();
    try {
      OccupancyBlock.insertMany = async function (documents, options) {
        await OccupancyBlock.create({ ...documents[1], appointmentId: fixtureId });
        return insertBlocks.call(this, documents, options);
      };
      const raced = await post(base, body(initial.slots[7].startsAt));
      assert.equal(raced.status, 409, 'Unique occupancy violation must return a genuine slot conflict');
      assert.equal((await raced.json()).error.code, 'SLOT_CONFLICT');
    } finally {
      OccupancyBlock.insertMany = insertBlocks;
      await OccupancyBlock.deleteMany({ appointmentId: fixtureId });
    }
    assert.deepEqual(await counts(), before, 'Unique collision rolled back all earlier inserted blocks');
  });
  await t.test('confirm/complete preserve occupancy, cancel releases atomically and reopens slot', async () => {
    const appointment = await Appointment.findOne().sort({ startsAt: 1 });
    const blockCount = await OccupancyBlock.countDocuments({ appointmentId: appointment._id });
    const removeBlocks = OccupancyBlock.deleteMany;
    try {
      OccupancyBlock.deleteMany = () => { throw new Error('Intentional integration cancellation failure'); };
      await assert.rejects(changeAppointmentStatus(appointment.reference, 'cancelled'));
      assert.equal((await Appointment.findById(appointment._id)).status, 'pending');
      assert.equal(await OccupancyBlock.countDocuments({ appointmentId: appointment._id }), blockCount);
    } finally { OccupancyBlock.deleteMany = removeBlocks; }
    await changeAppointmentStatus(appointment.reference, 'confirmed');
    assert.equal(await OccupancyBlock.countDocuments({ appointmentId: appointment._id }), blockCount);
    await changeAppointmentStatus(appointment.reference, 'cancelled');
    assert.equal(await OccupancyBlock.countDocuments({ appointmentId: appointment._id }), 0);
    const reopened = await getAvailability('classic-cut', 'adrian-cole', initial.date, defaultPolicy);
    assert(reopened.slots.some(slot => slot.startsAt === appointment.startsAt.toISOString()));
    const replacement = await createAppointment(normalized(body(appointment.startsAt.toISOString())), defaultPolicy);
    await changeAppointmentStatus(replacement.reference, 'confirmed');
    await changeAppointmentStatus(replacement.reference, 'completed');
    assert.equal(await OccupancyBlock.countDocuments({ appointmentId: (await Appointment.findOne({ reference: replacement.reference }))._id }), 3);
    await assert.rejects(changeAppointmentStatus(replacement.reference, 'cancelled'), error => error.status === 409);
  });
  await t.test('inactive and unsupported records, past times, time off and empty states', async () => {
    const input = normalized(body(initial.slots[7].startsAt));
    await Service.updateOne({ _id: 'classic-cut' }, { $set: { isActive: false } });
    await assert.rejects(createAppointment(input, defaultPolicy), error => error.status === 404);
    await Service.updateOne({ _id: 'classic-cut' }, { $set: { isActive: true } });
    await Barber.updateOne({ _id: 'adrian-cole' }, { $set: { isActive: false } });
    await assert.rejects(createAppointment(input, defaultPolicy), error => error.status === 404);
    await Barber.updateOne({ _id: 'adrian-cole' }, { $set: { isActive: true, supportedServiceIds: ['skin-fade'] } });
    await assert.rejects(createAppointment(input, defaultPolicy), error => error.status === 400);
    await Barber.updateOne({ _id: 'adrian-cole' }, { $set: { supportedServiceIds: ['classic-cut', 'skin-fade', 'beard-sculpt', 'cut-and-beard', 'full-service'] } });
    await assert.rejects(createAppointment({ ...input, startsAt: new Date(Date.now() - 86400000).toISOString() }, defaultPolicy), error => error.status === 400);
    await WorkingSchedule.updateOne({ barberId: 'adrian-cole' }, { $set: { timeOff: [{ startsAt: new Date(initial.slots[7].startsAt), endsAt: new Date(Date.parse(initial.slots[7].startsAt) + 3600000) }] } });
    await assert.rejects(createAppointment(input, defaultPolicy), error => error.status === 409);
    await WorkingSchedule.updateOne({ barberId: 'adrian-cole' }, { $set: { timeOff: [] } });
    const sunday = Array.from({ length: 7 }, (_, i) => localParts(new Date(Date.now() + (i + 2) * 86400000), defaultPolicy.timezone)).find(part => part.day === 0);
    const closed = await getAvailability('classic-cut', 'any', sunday.date, defaultPolicy);
    assert.deepEqual(closed.slots, []); assert.equal(closed.emptyReason, 'NO_AVAILABLE_SLOTS');
  });
  await t.test('Any Available persists a supported eligible barber', async () => {
    const choices = await findDay('any');
    const slot = choices.slots.at(-1);
    const booked = await createAppointment(normalized(body(slot.startsAt, 'any')), defaultPolicy);
    assert(slot.barbers.some(barber => barber.id === booked.barberId));
  });
  await t.test('separate Node API instances cannot concurrently reserve overlapping blocks', async () => {
    const urls = [];
    for (let i = 0; i < 2; i++) {
      const worker = fork(new URL('./api-worker.js', import.meta.url), [], { env: { ...process.env, MONGODB_URI: uri, MONGODB_TEST_DB: database }, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
      workers.push(worker);
      const [message] = await once(worker, 'message');
      assert(message.port, message.error); urls.push(`http://127.0.0.1:${message.port}`);
    }
    const free = await findDay('marcus-bennett');
    const first = free.slots[1]; const overlapping = free.slots[2];
    const responses = await Promise.all([post(urls[0], body(first.startsAt, 'marcus-bennett')), post(urls[1], body(overlapping.startsAt, 'marcus-bennett'))]);
    assert.deepEqual(responses.map(response => response.status).sort(), [201, 409]);
    const outcomes = await Promise.all(responses.map(response => response.json()));
    const success = outcomes.find(result => result.appointment).appointment;
    const stored = await Appointment.findOne({ reference: success.reference });
    assert.equal(await OccupancyBlock.countDocuments({ appointmentId: stored._id }), 3);
    const owners = await OccupancyBlock.find({ barberId: 'marcus-bennett', startsAt: { $gte: new Date(first.startsAt), $lt: new Date(Date.parse(overlapping.startsAt) + 45 * 60000) } }).distinct('appointmentId');
    assert.equal(owners.length, 1);
    // Any Available can allocate a different barber while an exact slot is occupied.
    const any = await post(urls[0], body(success.startsAt, 'any'));
    assert.equal(any.status, 201); assert.notEqual((await any.json()).appointment.barberId, 'marcus-bennett');
  });
  await t.test('database rate limit returns 429, errors are safe, unknown reference is 404', async () => {
    const limited = createApp({ ...defaultPolicy, rateLimitMax: 1 }).listen(0, '127.0.0.1');
    await once(limited, 'listening');
    try {
      const url = `http://127.0.0.1:${limited.address().port}`;
      await BookingRateLimit.deleteMany({}); // Isolated test database only.
      const invalidWindow = body('2000-01-01T18:00:00Z');
      const first = await post(url, invalidWindow); assert.equal(first.status, 400);
      const second = await post(url, invalidWindow); assert.equal(second.status, 429);
      assert.equal(second.headers.get('Retry-After'), '900');
      const response = await second.json(); assert(!JSON.stringify(response).includes('stack'));
      const missing = await fetch(base + '/api/appointments/' + 'A'.repeat(32)); assert.equal(missing.status, 404);
      const increment = BookingRateLimit.findOneAndUpdate;
      try {
        BookingRateLimit.findOneAndUpdate = () => { throw new Error('synthetic-private-detail'); };
        const failed = await post(url, invalidWindow);
        assert.equal(failed.status, 500);
        assert.deepEqual(await failed.json(), { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
      } finally { BookingRateLimit.findOneAndUpdate = increment; }
    } finally { await new Promise(resolve => { limited.close(resolve); limited.closeIdleConnections(); }); }
  });
});
