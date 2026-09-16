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
       updated_at = now()
     where id = $4 returning *`,
    [input.name ?? null, input.techLead ?? null, input.offlineSyncEnabled ?? null, farmId],
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
