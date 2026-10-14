import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../dist/app.js';

test('strict API validation rejects unknown fields, invalid dates, IDs, customer data and unaligned instants before database access', async (t) => {
  const server = createApp().listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeIdleConnections(); }));
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const path of ['/api/availability?serviceId=classic-cut&date=2026-02-30', '/api/availability?serviceId=classic-cut&date=2026-02-01&extra=1', '/api/availability?serviceId[$ne]=x&date=2026-02-01', '/api/appointments/guessed-id']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'INVALID_REQUEST');
  }
  const valid = { serviceId: 'classic-cut', barberId: 'any', startsAt: '2027-01-04T18:00:00Z', customer: { name: 'Integration Test', email: 'test@example.invalid' } };
  for (const body of [{ ...valid, extra: true }, { ...valid, startsAt: '2027-01-04T18:01:00Z' }, { ...valid, customer: { ...valid.customer, email: 'not-email' } }, { ...valid, customer: { ...valid.customer, role: 'admin' } }, { ...valid, customer: { ...valid.customer, phone: 'abc' } }, { ...valid, startsAt: '2027-01-04T18:00:00+00:00' }]) {
    const response = await fetch(base + '/api/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'INVALID_REQUEST');
  }
});
