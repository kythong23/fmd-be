import type { z } from 'zod';
import { query } from '../db/pool.js';
import { notFound } from '../errors.js';
import { toFarm } from '../mappers.js';
import type { benchmarkSchema, farmSettingsSchema } from '../schemas.js';

export async function getFarm(farmId: string) {
  const { rows } = await query('select * from farms where id = $1', [farmId]);
  if (!rows[0]) throw notFound('FARM_NOT_FOUND', 'Không tìm thấy vườn');
  return toFarm(rows[0]);
}

/** PATCH /farm/benchmark — chỉ manager. Mốc lệch là cả bản đồ lệch. */
export async function updateBenchmark(farmId: string, input: z.infer<typeof benchmarkSchema>) {
  const { rows } = await query(
    `update farms set
       benchmark_code = coalesce($1, benchmark_code),
       benchmark_name = coalesce($2, benchmark_name),
       plot_number = coalesce($3, plot_number),
       address = coalesce($4, address),
       benchmark_lat = $5,
       benchmark_lng = $6,
       benchmark_elevation_m = coalesce($7, benchmark_elevation_m),
       benchmark_datum = coalesce($8, benchmark_datum),
       benchmark_zone = coalesce($9, benchmark_zone),
       benchmark_source = coalesce($10, benchmark_source),
       benchmark_updated_at = now(),
       updated_at = now()
     where id = $11 returning *`,
    [
      input.code ?? null, input.name ?? null, input.plotNumber ?? null, input.address ?? null,
      input.lat, input.lng, input.elevationMeters ?? null, input.datum ?? null, input.zone ?? null,
      input.source ?? 'manual', farmId,
    ],
  );
  if (!rows[0]) throw notFound('FARM_NOT_FOUND', 'Không tìm thấy vườn');
  return toFarm(rows[0]);
}

/** PATCH /farm/settings — public_view_enabled không expose (D1). */
export async function updateSettings(farmId: string, input: z.infer<typeof farmSettingsSchema>) {
  const { rows } = await query(
    `update farms set
       name = coalesce($1, name),
       tech_lead = coalesce($2, tech_lead),
       offline_sync_enabled = coalesce($3, offline_sync_enabled),
       estimated_tree_count = coalesce($4, estimated_tree_count),
       updated_at = now()
     where id = $5 returning *`,
    [input.name ?? null, input.techLead ?? null, input.offlineSyncEnabled ?? null,
     input.estimatedTreeCount ?? null, farmId],
  );
  if (!rows[0]) throw notFound('FARM_NOT_FOUND', 'Không tìm thấy vườn');
  return toFarm(rows[0]);
}

/** Số liệu tổng quan cho Dashboard — đếm ở DB, không kéo 250 cây về BE để đếm. */
export async function getFarmStats(farmId: string) {
  const { rows } = await query(
    `select count(*)::int as total,
            count(*) filter (where status = 'healthy')::int as healthy,
            count(*) filter (where status = 'monitoring')::int as monitoring,
            count(*) filter (where status = 'problem')::int as problem,
            count(*) filter (where status = 'unknown')::int as unknown,
            coalesce(round(avg(health_score))::int, 0) as avg_health_score
     from trees where farm_id = $1`,
    [farmId],
  );
  return { ...rows[0], avgHealthScore: rows[0].avg_health_score, avg_health_score: undefined };
}

/**
 * Chủ vườn khai tổng số cây ước tính -> số mã QR luôn hội tụ về đúng con số đó:
 * thiếu thì tạo thêm, thừa thì xoá bớt. Idempotent, gọi bao nhiêu lần cũng ra cùng kết quả.
 * Chỉ xoá mã TRỐNG: cây đã quét hoặc đã có lịch sử thì giữ lại và báo về cho chủ vườn.
 * ponytail: generate_series + on conflict do nothing thay vì vòng lặp insert.
 */
export async function provisionTrees(farmId: string, estimatedTreeCount: number, prefix = 'SD') {
  const { rows } = await query(
    `with target as (
       select $2::text || '-' || lpad(n::text, greatest(3, length(n::text)), '0') as code
       from generate_series(1, $3::int) as n
     )
     insert into trees (farm_id, code, status)
     select $1, code, 'unknown' from target
     on conflict (code) do nothing
     returning code`,
    [farmId, prefix, estimatedTreeCount],
  );

  const pruned = await query(
    `delete from trees t
      where t.farm_id = $1
        and t.code ~ ('^' || $2 || '-[0-9]+$')
        and (substring(t.code from '[0-9]+$'))::int > $3::int
        and t.activated_at is null
        and not exists (select 1 from tree_history h where h.tree_id = t.id)
      returning t.code`,
    [farmId, prefix, estimatedTreeCount],
  );

  await query('update farms set estimated_tree_count = $2, updated_at = now() where id = $1',
    [farmId, estimatedTreeCount]);

  // Đếm ở statement riêng: subquery trong cùng CTE đọc snapshot TRƯỚC insert nên ra số cũ.
  const total = (await query('select count(*)::int as c from trees where farm_id = $1', [farmId])).rows[0].c;
  // Cây vượt quá N nhưng đã có dữ liệu nên không xoá được — chủ vườn cần biết để không bất ngờ.
  const kept = (await query(
    `select count(*)::int as c from trees
      where farm_id = $1 and code ~ ('^' || $2 || '-[0-9]+$')
        and (substring(code from '[0-9]+$'))::int > $3::int`,
    [farmId, prefix, estimatedTreeCount],
  )).rows[0].c;

  const created = rows.length;
  const deleted = pruned.rowCount ?? 0;
  const message = kept
    ? `Đã đặt tổng số cây ước tính là ${estimatedTreeCount}, nhưng còn ${kept} cây đã khai báo dữ liệu nằm ngoài phạm vi này nên được giữ lại. Tổng thực tế: ${total} cây.`
    : `Tổng số mã cây hiện là ${total} (tạo mới ${created}, xoá ${deleted} mã trống).`;

  return { estimatedTreeCount, created, deleted, kept, total, message, codes: rows.map((r) => r.code).sort() };
}
