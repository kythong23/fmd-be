import assert from 'node:assert/strict';
import test from 'node:test';

// config.ts đòi các biến này; đặt trước khi import để test chạy được không cần .env.
process.env.DATABASE_URL ??= 'postgres://x:y@localhost:5432/fdm';
process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret';

const { buildOpenApiDocument } = await import('../src/openapi.js');
const doc = buildOpenApiDocument() as any;

const operations = Object.entries(doc.paths).flatMap(([path, item]: [string, any]) =>
  Object.entries(item)
    .filter(([method]) => ['get', 'post', 'patch', 'put', 'delete'].includes(method))
    .map(([method, op]) => ({ path, method, op: op as any })),
);

test('doc sinh được và phủ đủ endpoint MVP của 04_API.md §1', () => {
  const ids = operations.map((o) => `${o.method.toUpperCase()} ${o.path}`);
  for (const expected of [
    'POST /auth/login', 'POST /auth/refresh', 'GET /auth/me', 'POST /auth/logout',
    'GET /trees', 'GET /trees/{code}', 'POST /trees', 'PATCH /trees/{code}',
    'PATCH /trees/{code}/position', 'DELETE /trees/{code}',
    'POST /trees/{code}/history', 'GET /trees/{code}/history', 'GET /activity',
    'GET /farm', 'PATCH /farm/benchmark', 'PATCH /farm/settings',
    'POST /uploads', 'GET /trees/{code}/qr', 'POST /qr/batch',
  ]) {
    assert.ok(ids.includes(expected), `thiếu tài liệu cho ${expected}`);
  }
});

test('mọi operation đều có response, và có 401 nếu cần đăng nhập', () => {
  const anonymous = new Set(['POST /auth/login', 'POST /auth/refresh']);
  for (const { path, method, op } of operations) {
    const id = `${method.toUpperCase()} ${path}`;
    assert.ok(Object.keys(op.responses ?? {}).length > 0, `${id} không khai báo response nào`);

    if (anonymous.has(id)) {
      assert.deepEqual(op.security, [], `${id} phải là route công khai`);
    } else {
      // D1: không có route đọc ẩn danh.
      assert.deepEqual(op.security, [{ bearerAuth: [] }], `${id} thiếu yêu cầu đăng nhập`);
      assert.ok(op.responses['401'], `${id} thiếu response 401`);
    }
  }
});

test('mọi $ref trong doc đều trỏ tới component có thật', () => {
  const components = new Set(Object.keys(doc.components?.schemas ?? {}));
  const refs: string[] = [];
  JSON.stringify(doc, (key, value) => {
    if (key === '$ref' && typeof value === 'string') refs.push(value);
    return value;
  });
  assert.ok(refs.length > 0, 'doc không tham chiếu component nào — schema có thể chưa được register');
  for (const ref of refs) {
    const name = ref.replace('#/components/schemas/', '');
    assert.ok(components.has(name), `$ref hỏng: ${ref}`);
  }
});

test('healthScore không xuất hiện trong body mà client gửi lên', () => {
  const body = (doc.paths['/trees/{code}/history'].post.requestBody.content['application/json'].schema ?? {}) as any;
  assert.equal('healthScore' in (body.properties ?? {}), false);
  // nhưng phải có trong response (BE trả về sau khi tính lại)
  assert.ok('healthScore' in doc.components.schemas.DurianTree.properties);
});
