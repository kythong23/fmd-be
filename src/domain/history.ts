/**
 * Nghiệp vụ cập nhật tình trạng — 04_API.md §2 bước 2-4.
 * Trước đây nằm ở FE (App.tsx). Để ở BE để mọi client đổi theo khi sửa 1 hàm.
 */
import type { ActionTaken, HistoryType, TreeStatus } from '../types/durian.js';

const ACTIVITY_LABELS: Record<ActionTaken, string> = {
  watering: 'Tưới nước bổ sung',
  fertilizing: 'Bón phân hữu cơ / NPK',
  spraying: 'Phun thuốc phòng trừ sâu bệnh',
  pruning: 'Cắt tỉa cành & neo trái',
  treatment: 'Điều trị bệnh thực địa',
  none: 'Kiểm tra sức khỏe định kỳ',
};

const HISTORY_TYPES: Record<ActionTaken, HistoryType> = {
  watering: 'watering',
  fertilizing: 'fertilizing',
  spraying: 'spraying',
  pruning: 'pruning',
  treatment: 'treatment',
  none: 'health_check',
};

export function activityLabel(action: ActionTaken): string {
  return ACTIVITY_LABELS[action] ?? ACTIVITY_LABELS.none;
}

export function historyType(action: ActionTaken): HistoryType {
  return HISTORY_TYPES[action] ?? 'health_check';
}

/**
 * Heuristic của bản demo (04_API.md §2 bước 4). Khi có tiêu chí VietGAP thật thì sửa ở đây.
 * ponytail: công thức thuần, không chạm DB — vì vậy test được bằng assert, xem test/domain.test.ts
 */
export function nextHealthScore(current: number, status: TreeStatus): number {
  const score = Number.isFinite(current) ? current : 70;
  switch (status) {
    case 'healthy':
      return Math.min(100, Math.max(88, score + 5));
    case 'monitoring':
      return Math.min(84, Math.max(70, score));
    case 'problem':
      return Math.min(65, Math.max(45, score - 15));
    default:
      return Math.min(100, Math.max(0, score));
  }
}

/** Tuổi cây tính từ ngày trồng — FE cũ lưu cả `age` lẫn `plantedDate` nên lệch nhau. */
export function ageFromPlantedDate(plantedDate: string | Date, now = new Date()): number {
  const d = plantedDate instanceof Date ? plantedDate : new Date(plantedDate);
  let years = now.getUTCFullYear() - d.getUTCFullYear();
  const md = now.getUTCMonth() - d.getUTCMonth();
  if (md < 0 || (md === 0 && now.getUTCDate() < d.getUTCDate())) years--;
  return Math.max(0, years);
}
