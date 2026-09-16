/**
 * ponytail: service ôm luôn SQL, không tách repository riêng — 5 bảng, 1 nguồn dữ liệu.
 * Tách repo khi có nguồn thứ 2 (cache / read replica).
 */
import type { PoolClient } from 'pg';
import type { z } from 'zod';
import { query } from '../db/pool.js';
import { notFound } from '../errors.js';
import { toHistory, toTree } from '../mappers.js';
import type { DurianTree } from '../types/durian.js';
import type { createTreeSchema, treeListQuerySchema, updatePositionSchema, updateTreeSchema } from '../schemas.js';

export const TREE_COLUMNS = `id, farm_id, code, variety, planted_date, block, row_no, position_no,
  lat, lng, map_x, map_y, bed_name, mound_number, canopy_radius, status, health_score, soil_moisture,
  leaf_condition, flowering, flowering_stage, fruit_condition, fruit_count, height_meters,
  trunk_diameter_cm, image_url, notes, last_updated, last_updated_by, created_at`;

/** Hàng thô — cần cho check quyền (farm_id + block) trước khi map ra API shape. */
export async function findTreeRow(code: string, client?: PoolClient) {
  const sql = `select ${TREE_COLUMNS} from trees where code = $1`;
  const { rows } = client ? await client.query(sql, [code]) : await query(sql, [code]);
  if (!rows[0]) throw notFound('TREE_NOT_FOUND', 'Không tìm thấy cây');
  return rows[0];
}

export async function listTrees(farmId: string, q: z.infer<typeof treeListQuerySchema>) {
  const where: string[] = ['farm_id = $1'];
  const params: unknown[] = [farmId];
  if (q.block) where.push(`block = $${params.push(q.block)}`);
  if (q.status) where.push(`status = $${params.push(q.status)}`);
  if (q.q) where.push(`(code ilike $${params.push(`%${q.q}%`)} or bed_name ilike $${params.length})`);
  if (q.cursor) where.push(`code > $${params.push(q.cursor)}`);

  const limitParam = params.push(q.limit + 1);
  const { rows } = await query(
    `select ${TREE_COLUMNS} from trees where ${where.join(' and ')} order by code asc limit $${limitParam}`,
    params,
  );
  const hasMore = rows.length > q.limit;
  const page = hasMore ? rows.slice(0, q.limit) : rows;
  // GET /trees không kèm history (04_API.md §1 — trả mảng nhẹ)
  return { items: page.map((r) => toTree(r)), nextCursor: hasMore ? page[page.length - 1].code : null };
}

/** GET /trees/:code — kèm history + gallery. */
export async function getTreeDetail(row: any): Promise<DurianTree> {
  const [history, gallery] = await Promise.all([
    query('select * from tree_history where tree_id = $1 order by occurred_at desc limit 50', [row.id]),
    query('select url from tree_images where tree_id = $1 order by sort_order asc, created_at asc', [row.id]),
  ]);
  return toTree(row, history.rows.map(toHistory), gallery.rows.map((r) => r.url));
}

/**
 * BE sinh code (04_API.md §1): max số đang có + 1 — xoá cây không gây trùng mã như
 * cách `trees.length + 1` của prototype.
 * ponytail: dựa vào UNIQUE(code) để bắt đua thay vì khoá bảng; đủ cho ~250 cây/vườn.
 */
export async function nextTreeCode(client: PoolClient, farmId: string, prefix = 'SD'): Promise<string> {
  const { rows } = await client.query(
    `select coalesce(max((substring(code from '[0-9]+$'))::int), 0) as max_no from trees
     where farm_id = $1 and code ~ ('^' || $2 || '-[0-9]+$')`,
    [farmId, prefix],
  );
  return `${prefix}-${String(Number(rows[0].max_no) + 1).padStart(3, '0')}`;
}

type CreateInput = z.infer<typeof createTreeSchema>;
type UpdateInput = z.infer<typeof updateTreeSchema>;

export async function createTree(client: PoolClient, farmId: string, input: CreateInput, actor: string) {
  const code = await nextTreeCode(client, farmId);
  const { rows } = await client.query(
    `insert into trees (farm_id, code, variety, planted_date, block, row_no, position_no, lat, lng,
       map_x, map_y, bed_name, mound_number, canopy_radius, status, health_score, soil_moisture,
       leaf_condition, flowering, flowering_stage, fruit_condition, fruit_count, height_meters,
       trunk_diameter_cm, image_url, notes, last_updated, last_updated_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,now(),$27)
     returning ${TREE_COLUMNS}`,
    [
      farmId, code, input.variety, input.plantedDate,
      input.block ?? null, input.row ?? null, input.position ?? null,
      input.coordinates?.lat ?? null, input.coordinates?.lng ?? null,
      input.mapPosition?.x ?? null, input.mapPosition?.y ?? null,
      input.bedName ?? null, input.moundNumber ?? null, input.canopyRadius ?? 25,
      input.status ?? 'unknown', 70, input.soilMoisture ?? null,
      input.leafCondition ?? 'good', input.flowering ?? false, input.floweringStage ?? null,
      input.fruitCondition ?? 'none', input.fruitCount ?? null, input.heightMeters ?? null,
      input.trunkDiameterCm ?? null, input.image ?? null, input.notes ?? null, actor,
    ],
  );
  return rows[0];
}

const FIELD_TO_COLUMN: Record<string, string> = {
  variety: 'variety', plantedDate: 'planted_date', block: 'block', row: 'row_no', position: 'position_no',
  bedName: 'bed_name', moundNumber: 'mound_number', canopyRadius: 'canopy_radius', status: 'status',
  soilMoisture: 'soil_moisture', leafCondition: 'leaf_condition', flowering: 'flowering',
  floweringStage: 'flowering_stage', fruitCondition: 'fruit_condition', fruitCount: 'fruit_count',
  heightMeters: 'height_meters', trunkDiameterCm: 'trunk_diameter_cm', image: 'image_url', notes: 'notes',
};

export async function updateTree(code: string, input: UpdateInput, actor: string) {
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [field, column] of Object.entries(FIELD_TO_COLUMN)) {
    const value = (input as Record<string, unknown>)[field];
    if (value !== undefined) sets.push(`${column} = $${params.push(value)}`);
  }
  if (input.coordinates) {
    sets.push(`lat = $${params.push(input.coordinates.lat)}`, `lng = $${params.push(input.coordinates.lng)}`);
  }
  if (input.mapPosition) {
    sets.push(`map_x = $${params.push(input.mapPosition.x)}`, `map_y = $${params.push(input.mapPosition.y)}`);
  }
  // health_score cố tình KHÔNG có ở đây: chỉ POST /history mới được đổi (06_BACKEND §12).
  if (!sets.length) return findTreeRow(code);
  sets.push('last_updated = now()', `last_updated_by = $${params.push(actor)}`);
  const { rows } = await query(
    `update trees set ${sets.join(', ')} where code = $${params.push(code)} returning ${TREE_COLUMNS}`,
    params,
  );
  if (!rows[0]) throw notFound('TREE_NOT_FOUND', 'Không tìm thấy cây');
  return rows[0];
}

/** Giai đoạn 2 — kéo-thả bản đồ. lat/lng là nguồn sự thật, map_x/y là cache hiển thị (D5). */
export async function updateTreePosition(code: string, input: z.infer<typeof updatePositionSchema>, actor: string) {
  const { rows } = await query(
    `update trees set lat = $1, lng = $2, map_x = $3, map_y = $4, last_updated = now(), last_updated_by = $5
     where code = $6 returning ${TREE_COLUMNS}`,
    [input.coordinates.lat, input.coordinates.lng, input.mapPosition?.x ?? null, input.mapPosition?.y ?? null, actor, code],
  );
  if (!rows[0]) throw notFound('TREE_NOT_FOUND', 'Không tìm thấy cây');
  return rows[0];
}

export async function deleteTree(code: string, farmId: string) {
  const { rowCount } = await query('delete from trees where code = $1 and farm_id = $2', [code, farmId]);
  if (!rowCount) throw notFound('TREE_NOT_FOUND', 'Không tìm thấy cây');
}
