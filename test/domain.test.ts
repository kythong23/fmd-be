import assert from 'node:assert/strict';
import test from 'node:test';
import { activityLabel, ageFromPlantedDate, historyType, nextHealthScore } from '../src/domain/history.js';
import { createHistorySchema } from '../src/schemas.js';

test('healthScore kẹp đúng biên theo 04_API.md §2', () => {
  assert.equal(nextHealthScore(92, 'healthy'), 97);
  assert.equal(nextHealthScore(99, 'healthy'), 100); // trần 100
  assert.equal(nextHealthScore(40, 'healthy'), 88); // sàn 88
  assert.equal(nextHealthScore(90, 'monitoring'), 84); // trần 84
  assert.equal(nextHealthScore(50, 'monitoring'), 70); // sàn 70
  assert.equal(nextHealthScore(90, 'problem'), 65); // trần 65
  assert.equal(nextHealthScore(50, 'problem'), 45); // sàn 45
});

test('actionTaken sinh đúng activity + type', () => {
  assert.equal(activityLabel('watering'), 'Tưới nước bổ sung');
  assert.equal(activityLabel('none'), 'Kiểm tra sức khỏe định kỳ');
  assert.equal(historyType('none'), 'health_check');
  assert.equal(historyType('spraying'), 'spraying');
});

test('tuổi cây tính từ plantedDate, chưa tới sinh nhật thì chưa cộng', () => {
  assert.equal(ageFromPlantedDate('2020-06-12', new Date('2026-09-15T00:00:00Z')), 6);
  assert.equal(ageFromPlantedDate('2020-06-12', new Date('2026-06-11T00:00:00Z')), 5);
});

test('payload history: client không gửi được healthScore, description được phép để trống', () => {
  const parsed = createHistorySchema.parse({
    status: 'healthy',
    description: 'Đọt già đều',
    actionTaken: 'watering',
    healthScore: 100,
  } as Record<string, unknown>);
  assert.equal('healthScore' in parsed, false);
  assert.deepEqual(parsed.images, []);
  assert.deepEqual(parsed.conditions, []);

  assert.equal(
    createHistorySchema.parse({ status: 'healthy', description: '   ', actionTaken: 'none' }).description,
    '',
  );
  assert.equal(
    createHistorySchema.parse({ status: 'healthy', actionTaken: 'none' }).description,
    '',
  );
  assert.throws(() =>
    createHistorySchema.parse({
      status: 'healthy',
      description: 'ok',
      actionTaken: 'none',
      measurements: { soilMoisture: 140 },
    }),
  );
});

test('danh mục giống: worker/viewer không thấy unitPrice (D10 → D9)', async () => {
  const { toVariety } = await import('../src/mappers.js');
  const row = {
    id: '00000000-0000-0000-0000-000000000001', name: 'Ri6', unit_price: '45000.00', active: true,
    notes: null, created_at: new Date('2026-09-23T00:00:00Z'), updated_at: new Date('2026-09-23T00:00:00Z'),
  };
  assert.equal(toVariety(row, 'manager').unitPrice, 45000);
  assert.equal(toVariety({ ...row, unit_price: null }, 'manager').unitPrice, null);
  for (const role of ['worker', 'viewer'] as const) {
    assert.ok(!('unitPrice' in toVariety(row, role)), `${role} không được thấy field unitPrice`);
  }
});

test('danh mục giống: validate payload theo 04_API §1', async () => {
  const { createVarietySchema, updateVarietySchema, varietyQuerySchema } = await import('../src/schemas.js');
  assert.ok(createVarietySchema.safeParse({ name: 'Ri6', active: true }).success);
  assert.ok(createVarietySchema.safeParse({ name: 'Ri6', unitPrice: null, active: true }).success);
  assert.ok(!createVarietySchema.safeParse({ name: '  ', active: true }).success); // name rỗng
  assert.ok(!createVarietySchema.safeParse({ name: 'Ri6' }).success); // thiếu active
  assert.ok(!createVarietySchema.safeParse({ name: 'Ri6', unitPrice: -1, active: true }).success);
  assert.ok(!updateVarietySchema.safeParse({}).success);
  assert.equal(varietyQuerySchema.parse({}).active, true); // mặc định chỉ giống đang dùng
  assert.equal(varietyQuerySchema.parse({ active: 'all' }).active, null);
});
