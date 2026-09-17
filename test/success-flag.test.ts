import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../src/app.js';

const srv = createApp().listen(0);
const base = `http://localhost:${(srv.address() as { port: number }).port}`;
test.after(() => srv.close());

test('200 -> success true, giữ nguyên body gốc', async () => {
  const r = await fetch(`${base}/health`);
  assert.deepEqual(await r.json(), { success: true, ok: true });
});

test('lỗi -> success false', async () => {
  const r = await fetch(`${base}/khong-ton-tai`);
  assert.equal(r.status, 404);
  assert.equal((await r.json()).success, false);
});

test('JSON hỏng -> 400 đúng format, không lộ stack', async () => {
  const r = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{bad',
  });
  assert.equal(r.status, 400);
  const body = await r.json();
  assert.equal(body.success, false);
  assert.equal(body.error.code, 'INVALID_JSON');
});
