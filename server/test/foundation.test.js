import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { createApp } from '../dist/app.js';
import { parseEnv } from '../dist/env.js';

const valid = {
  PORT: '3000',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/studio_north',
  CLIENT_ORIGIN: 'http://127.0.0.1:5173',
};

test('environment validates required fields, timezone and origin without leaking values', () => {
  assert.equal(parseEnv(valid).BUSINESS_TIMEZONE, 'America/Los_Angeles');
  for (const field of ['PORT', 'MONGODB_URI', 'CLIENT_ORIGIN']) {
    const input = { ...valid };
    delete input[field];
    assert.throws(() => parseEnv(input), new RegExp(field));
  }
  for (const PORT of ['', '0', '65536', '3.5', 'abc']) {
    assert.throws(() => parseEnv({ ...valid, PORT }), /PORT/);
  }
  assert.throws(() => parseEnv({ ...valid, BUSINESS_TIMEZONE: 'Not/AZone' }), /BUSINESS_TIMEZONE/);
  assert.throws(() => parseEnv({ ...valid, CLIENT_ORIGIN: 'https://example.com/path' }), /CLIENT_ORIGIN/);
  assert.throws(() => parseEnv({ ...valid, MONGODB_URI: 'secret-value' }), (error) => {
    assert.ok(!error.message.includes('secret-value'));
    return true;
  });
});

test('HTTP health honestly reports disconnected database and structured request errors', async (t) => {
  const server = createApp().listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeIdleConnections();
  }));
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 503);
  const body = await health.json();
  assert.equal(body.status, 'degraded');
  assert.deepEqual(body.database, { status: 'disconnected', connected: false });
  assert.ok(Number.isFinite(Date.parse(body.timestamp)));
  const missing = await fetch(`${base}/api/missing`);
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error.code, 'NOT_FOUND');
  const malformed = await fetch(`${base}/api/health`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error.code, 'INVALID_JSON');
  const oversized = await fetch(`${base}/api/health`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'x'.repeat(17000) }),
  });
  assert.equal(oversized.status, 413);
  assert.equal((await oversized.json()).error.code, 'PAYLOAD_TOO_LARGE');
});

test('startup exits nonzero with missing configuration', () => {
  const env = { ...process.env };
  for (const key of Object.keys(valid)) delete env[key];
  const result = spawnSync(process.execPath, ['dist/index.js'], { env, encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Invalid environment/);
  assert.doesNotMatch(result.stdout, /listening/);
});

test('startup exits clearly when the database cannot be reached', () => {
  // Port zero is invalid for a destination; this cannot accidentally hit a real database.
  const result = spawnSync(process.execPath, ['dist/index.js'], {
    env: { ...process.env, ...valid, MONGODB_URI: 'mongodb://127.0.0.1:0/studio_north' },
    encoding: 'utf8', timeout: 10000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /MongoDB startup connection failed/);
  assert.doesNotMatch(result.stdout, /listening/);
});
