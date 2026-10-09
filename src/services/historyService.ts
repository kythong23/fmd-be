/** POST /trees/:code/history — endpoint quan trọng nhất (04_API.md §2). */
import type { z } from 'zod';
import type { PoolClient } from 'pg';
import { query, withTransaction } from '../db/pool.js';
import { activityLabel, historyType, nextHealthScore } from '../domain/history.js';
import { notFound } from '../errors.js';
import { toHistory } from '../mappers.js';
import type { activityQuerySchema, createHistorySchema, historyQuerySchema } from '../schemas.js';
import type { AuthUser } from '../types/durian.js';
import { assertCanWriteTree } from '../middleware/auth.js';
import { resolveMaterialUsage } from './materialService.js';
import { findTreeRow, getTreeDetail, TREE_COLUMNS } from './treeService.js';

type Input = z.infer<typeof createHistorySchema>;

export async function createHistory(code: string, input: Input, user: AuthUser) {
  return withTransaction((client) => insertHistory(client, code, input, user));
}

/**
 * Thân của POST /trees/:code/history. Nhận client sẵn có để /tasks/:id/complete dùng lại
 * đúng logic này trong transaction của nó (04_API §2b: gọi lại cùng service, không copy code).
 */
export async function insertHistory(client: PoolClient, code: string, input: Input, user: AuthUser) {
  // Khoá hàng cây: 2 request song song cho cùng 1 cây không ghi đè health_score của nhau.
  const treeRes = await client.query(`select ${TREE_COLUMNS} from trees where code = $1 for update`, [code]);
  const tree = treeRes.rows[0];
  if (!tree) throw notFound('TREE_NOT_FOUND', 'Không tìm thấy cây');

  assertCanWriteTree(user, tree);

  // Chống ghi trùng: mất sóng ở góc vườn -> bấm Lưu nhiều lần (04_API.md §2).
  if (input.clientRequestId) {
    const dup = await client.query('select * from tree_history where client_request_id = $1', [input.clientRequestId]);
    if (dup.rows[0]) {
      return { created: false, record: toHistory(dup.rows[0]), tree: await getTreeDetail(tree, client) };
    }
  }

  // Nhãn activity + type do BE quyết định; giá trị client gửi (nếu có) bị bỏ qua.
  const activity = activityLabel(input.actionTaken);
  const type = historyType(input.actionTaken);
  const healthScore = nextHealthScore(Number(tree.health_score ?? 70), input.status);
  const performer = input.performer?.trim() || user.fullName;
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const m = input.measurements ?? {};
  // D8: snapshot vật tư — code/name/unit/unitPrice lấy từ danh mục, không tin client.
  const materials = await resolveMaterialUsage(client, tree.farm_id, input.materials);

  const inserted = await client.query(
    `insert into tree_history (tree_id, occurred_at, activity, type, status, description, performer,
       dosage, measurements, images, conditions, action_taken, notes, materials, created_by, client_request_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     returning *`,
    [
      tree.id, occurredAt, activity, type, input.status, input.description, performer,
      input.dosage ?? null, input.measurements ? JSON.stringify(input.measurements) : null,
      input.images, input.conditions, input.actionTaken, input.notes ?? null,
      JSON.stringify(materials), user.id, input.clientRequestId ?? null,
    ],
  );

  const updated = await client.query(
    `update trees set
       status = $1,
       health_score = $2,
       height_meters = coalesce($3, height_meters),
       trunk_diameter_cm = coalesce($4, trunk_diameter_cm),
       soil_moisture = coalesce($5, soil_moisture),
       fruit_count = coalesce($6, fruit_count),
       last_updated = $7,
       last_updated_by = $8
     where id = $9 returning ${TREE_COLUMNS}`,
    [
      input.status, healthScore,
      m.height ?? null, m.trunkDiameter ?? null, m.soilMoisture ?? null, m.fruitCount ?? null,
      occurredAt, performer, tree.id,
    ],
  );

  // Ảnh minh chứng vào gallery để TreePassport thấy ngay.
  for (const [i, url] of input.images.entries()) {
    await client.query('insert into tree_images (tree_id, url, sort_order) values ($1, $2, $3)', [tree.id, url, i]);
  }

  // Trả cây đã cập nhật kèm history -> FE thay thẳng vào state, không gọi lại GET.
  return { created: true, record: toHistory(inserted.rows[0]), tree: await getTreeDetail(updated.rows[0], client) };
}

export async function listTreeHistory(code: string, q: z.infer<typeof historyQuerySchema>) {
  const tree = await findTreeRow(code);
  const params: unknown[] = [tree.id];
  let where = 'tree_id = $1';
  if (q.cursor) where += ` and occurred_at < $${params.push(q.cursor)}`;
  const { rows } = await query(
    `select * from tree_history where ${where} order by occurred_at desc limit $${params.push(q.limit + 1)}`,
    params,
  );
  return page(rows, q.limit);
}

/** GET /activity — feed toàn vườn (04_API.md §1). */
export async function listFarmActivity(farmId: string, q: z.infer<typeof activityQuerySchema>) {
  const params: unknown[] = [farmId];
  const where = ['t.farm_id = $1'];
  if (q.type) where.push(`h.type = $${params.push(q.type)}`);
  if (q.q) where.push(`(h.description ilike $${params.push(`%${q.q}%`)} or h.activity ilike $${params.length} or t.code ilike $${params.length})`);
  if (q.cursor) where.push(`h.occurred_at < $${params.push(q.cursor)}`);

  const { rows } = await query(
    `select h.*, t.code as tree_code from tree_history h
     join trees t on t.id = h.tree_id
     where ${where.join(' and ')}
     order by h.occurred_at desc limit $${params.push(q.limit + 1)}`,
    params,
  );
  const hasMore = rows.length > q.limit;
  const slice = hasMore ? rows.slice(0, q.limit) : rows;
  return {
    items: slice.map((r) => ({ ...toHistory(r), treeCode: r.tree_code })),
    nextCursor: hasMore ? new Date(slice[slice.length - 1].occurred_at).toISOString() : null,
  };
}

function page(rows: any[], limit: number) {
  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  return {
    items: slice.map(toHistory),
    nextCursor: hasMore ? new Date(slice[slice.length - 1].occurred_at).toISOString() : null,
  };
}
