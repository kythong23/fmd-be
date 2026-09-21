/** Danh mục vật tư — 04_API.md §1 (MVP+ D7). Soft-delete bằng `active`, không DELETE cứng (D8). */
import type { PoolClient } from 'pg';
import type { z } from 'zod';
import { query } from '../db/pool.js';
import { badRequest, conflict, notFound } from '../errors.js';
import { toMaterial } from '../mappers.js';
import type { createMaterialSchema, materialQuerySchema, materialUsageInputSchema, updateMaterialSchema } from '../schemas.js';
import type { AuthUser, MaterialUsage } from '../types/durian.js';

const COLUMNS = 'id, farm_id, code, name, type, unit, unit_price, active, notes, created_at, updated_at';

export async function listMaterials(farmId: string, q: z.infer<typeof materialQuerySchema>, user: AuthUser) {
  const where = ['farm_id = $1'];
  const params: unknown[] = [farmId];
  if (q.type) where.push(`type = $${params.push(q.type)}`);
  if (q.active !== null) where.push(`active = $${params.push(q.active)}`);
  if (q.q) where.push(`(name ilike $${params.push(`%${q.q}%`)} or code ilike $${params.length})`);

  const { rows } = await query(
    `select ${COLUMNS} from materials where ${where.join(' and ')} order by type asc, name asc`,
    params,
  );
  return { items: rows.map((r) => toMaterial(r, user.role)) };
}

export async function createMaterial(farmId: string, input: z.infer<typeof createMaterialSchema>, user: AuthUser) {
  try {
    const { rows } = await query(
      `insert into materials (farm_id, code, name, type, unit, unit_price, notes)
       values ($1,$2,$3,$4,$5,$6,$7) returning ${COLUMNS}`,
      [farmId, input.code, input.name, input.type, input.unit, input.unitPrice ?? null, input.notes ?? null],
    );
    return toMaterial(rows[0], user.role);
  } catch (err: any) {
    if (err?.code === '23505') throw conflict('MATERIAL_CODE_EXISTS', `Mã vật tư ${input.code} đã tồn tại`);
    throw err;
  }
}

const FIELD_COLUMN: Record<string, string> = {
  code: 'code', name: 'name', type: 'type', unit: 'unit', unitPrice: 'unit_price', notes: 'notes', active: 'active',
};

export async function updateMaterial(id: string, farmId: string, input: z.infer<typeof updateMaterialSchema>, user: AuthUser) {
  const sets: string[] = [];
  const params: unknown[] = [id, farmId];
  for (const [key, col] of Object.entries(FIELD_COLUMN)) {
    const value = (input as Record<string, unknown>)[key];
    if (value !== undefined) sets.push(`${col} = $${params.push(value)}`);
  }
  // Đổi giá là PATCH unitPrice; updated_at chính là "Ngày cập nhật" trên màn danh mục.
  sets.push('updated_at = now()');
  try {
    const { rows } = await query(
      `update materials set ${sets.join(', ')} where id = $1 and farm_id = $2 returning ${COLUMNS}`,
      params,
    );
    if (!rows[0]) throw notFound('MATERIAL_NOT_FOUND', 'Không tìm thấy vật tư');
    return toMaterial(rows[0], user.role);
  } catch (err: any) {
    if (err?.code === '23505') throw conflict('MATERIAL_CODE_EXISTS', 'Mã vật tư đã tồn tại');
    throw err;
  }
}

/** DELETE = soft-delete (D8): lịch sử phải tra ngược được materialId. */
export async function deactivateMaterial(id: string, farmId: string, user: AuthUser) {
  const { rows } = await query(
    `update materials set active = false, updated_at = now() where id = $1 and farm_id = $2 returning ${COLUMNS}`,
    [id, farmId],
  );
  if (!rows[0]) throw notFound('MATERIAL_NOT_FOUND', 'Không tìm thấy vật tư');
  return toMaterial(rows[0], user.role);
}

/**
 * 04_API.md §2a — biến [{materialId, quantity}] của client thành snapshot đầy đủ.
 * Giá và tên là dữ liệu của server; nhận từ client là mở cửa sửa báo cáo chi phí.
 */
export async function resolveMaterialUsage(
  client: PoolClient,
  farmId: string,
  items: z.infer<typeof materialUsageInputSchema>[],
): Promise<MaterialUsage[]> {
  if (items.length === 0) return [];
  const ids = items.map((i) => i.materialId);
  if (new Set(ids).size !== ids.length) {
    // Gộp ngầm là giấu lỗi nhập liệu -> trả 400 (04_API §2a).
    throw badRequest('MATERIAL_DUPLICATED', 'Một vật tư chỉ được khai một dòng');
  }
  const { rows } = await client.query(
    `select id, code, name, unit, unit_price from materials
     where farm_id = $1 and active = true and id = any($2::uuid[])`,
    [farmId, ids],
  );
  const byId = new Map(rows.map((r) => [r.id, r]));
  return items.map((i) => {
    const m = byId.get(i.materialId);
    if (!m) throw badRequest('MATERIAL_NOT_AVAILABLE', `Vật tư ${i.materialId} không tồn tại hoặc đã ngừng dùng`);
    return {
      materialId: m.id,
      code: m.code,
      name: m.name,
      quantity: i.quantity,
      unit: m.unit,
      unitPrice: m.unit_price === null ? null : Number(m.unit_price),
    };
  });
}
