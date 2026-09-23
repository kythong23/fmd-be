import assert from 'node:assert/strict';
import test from 'node:test';
import { redact, redactUrl, subjectsOf } from '../src/middleware/apiLog.js';

test('redact ẩn mật khẩu/token nhưng giữ field khác', () => {
  const out = redact({ email: 'a@b.c', password: 'x', nested: { refreshToken: 'y', note: 'ok' } }) as any;
  assert.equal(out.email, 'a@b.c');
  assert.equal(out.password, '[redacted]');
  assert.equal(out.nested.refreshToken, '[redacted]');
  assert.equal(out.nested.note, 'ok');
});

test('subjectsOf gom mã cây từ url, payload và response', () => {
  const s = subjectsOf('/api/v1/trees/DR-001/history', { id: 'u1' }, { treeCode: 'DR-002' }, { tree: { code: 'DR-003' } });
  assert.deepEqual(s.sort(), ['tree:DR-001', 'tree:DR-002', 'tree:DR-003', 'user:u1']);
});

test('redactUrl che query nhạy cảm, giữ nguyên tham số khác', () => {
  assert.equal(redactUrl('/api/v1/x?draft=true&token=abc&accessToken=z'), '/api/v1/x?draft=true&token=***&accessToken=***');
  assert.equal(redactUrl('/api/v1/x'), '/api/v1/x');
});
