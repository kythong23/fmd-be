import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DATABASE_URL ??= 'postgres://x:y@localhost:5432/fdm';
process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret';

const { toCsv } = await import('../src/services/reportService.js');
const { costOf } = await import('../src/mappers.js');

test('costOf: vật tư chưa có giá tính 0 đồng, không làm hỏng tổng', () => {
  assert.equal(
    costOf([
      { materialId: 'a', code: 'PB-001', name: 'NPK', quantity: 2, unit: 'kg', unitPrice: 24000 },
      { materialId: 'b', code: 'VT-001', name: 'Bạt', quantity: 5, unit: 'm2', unitPrice: null },
    ]),
    48000,
  );
  assert.equal(costOf([]), 0);
});

test('toCsv: escape dấu phẩy/nháy trong tên vật tư và có BOM cho Excel', () => {
  const csv = toCsv({
    range: { from: '2026-09-01', to: '2026-10-01' },
    totalCost: 48000,
    byMaterial: [
      { materialId: 'a', code: 'PB-001', name: 'NPK 16-16-8, loại "xanh"', type: 'fertilizer', unit: 'kg', quantity: 2, cost: 48000, missingPrice: false },
    ],
    byType: [], byBlock: [], byActivity: [],
    coverage: { historyCount: 96, withMaterialsCount: 71 },
  });
  assert.ok(csv.startsWith('﻿'), 'thiếu BOM -> Excel Windows đọc lỗi font tiếng Việt');
  assert.ok(csv.includes('"NPK 16-16-8, loại ""xanh"""'), 'chưa escape đúng dấu phẩy + nháy kép');
  assert.ok(csv.includes('96,Có ghi vật tư,71'), 'CSV phải mang theo coverage, không chỉ số tiền');
});
