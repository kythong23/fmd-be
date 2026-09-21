/**
 * GET /reports/summary — 04_API.md §2c, SQL ở 03_DATABASE §6d.
 * Tổng hợp bằng SQL, không kéo tree_history về rồi cộng ở Node (02_ARCHITECTURE §3).
 */
import type { z } from 'zod';
import { query } from '../db/pool.js';
import { badRequest } from '../errors.js';
import type { reportQuerySchema } from '../schemas.js';
import type { ReportSummary } from '../types/durian.js';

type Q = z.infer<typeof reportQuerySchema>;

/** `to` exclusive; cùng bộ WHERE cho mọi truy vấn con để 4 bảng số liệu không lệch nhau. */
function scope(farmId: string, q: Q) {
  if (q.to <= q.from) throw badRequest('INVALID_RANGE', '`to` phải sau `from`');
  const params: unknown[] = [farmId, q.from, q.to];
  let where = 't.farm_id = $1 and h.occurred_at >= $2::date and h.occurred_at < $3::date';
  if (q.block) where += ` and t.block = $${params.push(q.block)}`;
  return { where, params };
}

export async function summary(farmId: string, q: Q): Promise<ReportSummary> {
  const { where, params } = scope(farmId, q);
  // Lọc theo loại vật tư: chỉ áp cho các bảng tính tiền, không áp cho coverage/byActivity
  // (số bản ghi của cả kỳ mới là mẫu số trung thực).
  const matJoin = `cross join lateral jsonb_array_elements(h.materials) m
     left join materials mt on mt.id = (m->>'materialId')::uuid`;
  const matWhere = q.type ? ` and mt.type = $${params.push(q.type)}` : '';

  const [byMaterial, byType, byBlock, byActivity, coverage] = await Promise.all([
    query(
      `select m->>'materialId' as material_id, max(m->>'code') as code, max(m->>'name') as name,
              max(mt.type) as type, max(m->>'unit') as unit,
              sum((m->>'quantity')::numeric) as quantity,
              sum((m->>'quantity')::numeric * coalesce((m->>'unitPrice')::numeric, 0)) as cost,
              bool_or(m->>'unitPrice' is null) as missing_price
       from tree_history h join trees t on t.id = h.tree_id ${matJoin}
       where ${where}${matWhere}
       group by 1 order by cost desc nulls last`,
      params,
    ),
    query(
      `select mt.type as type,
              sum((m->>'quantity')::numeric * coalesce((m->>'unitPrice')::numeric, 0)) as cost
       from tree_history h join trees t on t.id = h.tree_id ${matJoin}
       where ${where}${matWhere}
       group by 1 order by cost desc nulls last`,
      params,
    ),
    query(
      `select t.block as block,
              coalesce(sum((m->>'quantity')::numeric * coalesce((m->>'unitPrice')::numeric, 0)), 0) as cost,
              count(distinct h.id) as activity_count
       from tree_history h join trees t on t.id = h.tree_id
         left join lateral jsonb_array_elements(h.materials) m on true
         left join materials mt on mt.id = (m->>'materialId')::uuid
       where ${where}${matWhere}
       group by 1 order by cost desc nulls last`,
      params,
    ),
    query(
      `select h.type as type, count(*) as count
       from tree_history h join trees t on t.id = h.tree_id
       where ${where} group by 1 order by count desc`,
      params.slice(0, q.block ? 4 : 3),
    ),
    query(
      `select count(*) as history_count,
              count(*) filter (where jsonb_array_length(h.materials) > 0) as with_materials_count
       from tree_history h join trees t on t.id = h.tree_id
       where ${where}`,
      params.slice(0, q.block ? 4 : 3),
    ),
  ]);

  const materials = byMaterial.rows.map((r) => ({
    materialId: r.material_id,
    code: r.code,
    name: r.name,
    type: r.type,
    unit: r.unit,
    quantity: Number(r.quantity),
    cost: Number(r.cost),
    // 04_API §2c: vật tư chưa có giá vẫn cộng quantity, cost = 0 — đánh dấu để UI không hiểu nhầm.
    missingPrice: !!r.missing_price,
  }));

  return {
    range: { from: q.from, to: q.to },
    totalCost: materials.reduce((s, m) => s + m.cost, 0),
    byMaterial: materials,
    byType: byType.rows.filter((r) => r.type !== null).map((r) => ({ type: r.type, cost: Number(r.cost) })),
    byBlock: byBlock.rows.map((r) => ({
      block: r.block,
      cost: Number(r.cost),
      activityCount: Number(r.activity_count),
    })),
    byActivity: byActivity.rows.map((r) => ({ type: r.type, count: Number(r.count) })),
    coverage: {
      historyCount: Number(coverage.rows[0]?.history_count ?? 0),
      withMaterialsCount: Number(coverage.rows[0]?.with_materials_count ?? 0),
    },
  };
}

/** CSV sinh ở BE để nút "Xuất" và bảng trên màn hình dùng chung một nguồn số (04_API §1). */
export function toCsv(data: ReportSummary): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [
    ['Mã vật tư', 'Tên vật tư', 'Loại', 'Đơn vị', 'Số lượng', 'Thành tiền (VND)', 'Thiếu đơn giá'],
    ...data.byMaterial.map((m) => [m.code, m.name, m.type, m.unit, m.quantity, m.cost, m.missingPrice ? 'x' : '']),
    [],
    ['Tổng cộng', '', '', '', '', data.totalCost, ''],
    ['Bản ghi trong kỳ', data.coverage.historyCount, 'Có ghi vật tư', data.coverage.withMaterialsCount],
  ];
  // BOM: Excel trên Windows đọc UTF-8 không BOM thành tiếng Việt lỗi font.
  return '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
}
