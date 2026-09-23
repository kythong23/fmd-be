/**
 * Danh mục cây giống — 04_API.md §1 (MVP+ D10). Soft-delete bằng `active` (cùng D8).
 * Độc lập với chuỗi D7: không snapshot vào tree_history, không cấp số cho /reports.
 */
import type { z } from 'zod';
import { query } from '../db/pool.js';
import { notFound } from '../errors.js';
import { toVariety } from '../mappers.js';
import type { createVarietySchema, updateVarietySchema, varietyQuerySchema } from '../schemas.js';
import type { AuthUser } from '../types/durian.js';

const COLUMNS = 'id, farm_id, name, unit_price, active, notes, created_at, updated_at';

export async function listVarieties(farmId: string, q: z.infer<typeof varietyQuerySchema>, user: AuthUser) {
  const where = ['farm_id = $1'];
  const params: unknown[] = [farmId];
  if (q.active !== null) where.push(`active = $${params.push(q.active)}`);
  if (q.q) where.push(`name ilike $${params.push(`%${q.q}%`)}`);

  const { rows } = await query(
    `select ${COLUMNS} from varieties where ${where.join(' and ')} order by name asc, created_at asc`,
    params,
  );
  return { items: rows.map((r) => toVariety(r, user.role)) };
}

export async function createVariety(farmId: string, input: z.infer<typeof createVarietySchema>, user: AuthUser) {
  const { rows } = await query(
    `insert into varieties (farm_id, name, unit_price, active, notes)
     values ($1,$2,$3,$4,$5) returning ${COLUMNS}`,
    [farmId, input.name, input.unitPrice ?? null, input.active, input.notes ?? null],
  );
  return toVariety(rows[0], user.role);
}

const FIELD_COLUMN: Record<string, string> = {
  name: 'name', unitPrice: 'unit_price', active: 'active', notes: 'notes',
};

export async function updateVariety(id: string, farmId: string, input: z.infer<typeof updateVarietySchema>, user: AuthUser) {
  const sets: string[] = [];
  const params: unknown[] = [id, farmId];
  for (const [key, col] of Object.entries(FIELD_COLUMN)) {
    const value = (input as Record<string, unknown>)[key];
    if (value !== undefined) sets.push(`${col} = $${params.push(value)}`);
  }
  // Đổi giá là PATCH unitPrice; updated_at là "Ngày cập nhật" trên màn danh mục.
  sets.push('updated_at = now()');
  const { rows } = await query(
    `update varieties set ${sets.join(', ')} where id = $1 and farm_id = $2 returning ${COLUMNS}`,
    params,
  );
  if (!rows[0]) throw notFound('VARIETY_NOT_FOUND', 'Không tìm thấy giống cây');
  return toVariety(rows[0], user.role);
}

/** DELETE = soft-delete (D10 → D8): giống có thể đang gắn với cây đã trồng. */
export async function deactivateVariety(id: string, farmId: string, user: AuthUser) {
  const { rows } = await query(
    `update varieties set active = false, updated_at = now() where id = $1 and farm_id = $2 returning ${COLUMNS}`,
    [id, farmId],
  );
  if (!rows[0]) throw notFound('VARIETY_NOT_FOUND', 'Không tìm thấy giống cây');
  return toVariety(rows[0], user.role);
}
