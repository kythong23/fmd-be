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

test('payload history: client không gửi được healthScore, description rỗng bị chặn', () => {
  const parsed = createHistorySchema.parse({
    status: 'healthy',
    description: 'Đọt già đều',
    actionTaken: 'watering',
    healthScore: 100,
  } as Record<string, unknown>);
  assert.equal('healthScore' in parsed, false);
  assert.deepEqual(parsed.images, []);
  assert.deepEqual(parsed.conditions, []);

  assert.throws(() => createHistorySchema.parse({ status: 'healthy', description: '   ', actionTaken: 'none' }));
  assert.throws(() =>
    createHistorySchema.parse({
      status: 'healthy',
      description: 'ok',
      actionTaken: 'none',
      measurements: { soilMoisture: 140 },
    }),
  );
});
