/**
 * Seed dev từ dữ liệu prototype (03_DATABASE.md §8): 1 vườn + 16 cây + lịch sử + gallery + 3 tài khoản.
 * Idempotent: chạy lại sẽ xoá sạch dữ liệu vườn seed rồi nạp lại. KHÔNG chạy trên production.
 */
import { pool, withTransaction } from '../db/pool.js';
import { ageFromPlantedDate } from '../domain/history.js';
import { hashPassword } from '../services/authService.js';
import { DEFAULT_CADASTRAL_BENCHMARK, TREE_SPATIAL_MAP, type TreeSpatialData } from './data/farmMapData.js';
import { SEED_MATERIALS } from './data/materials.js';
import { INITIAL_TREES } from './data/mockTrees.js';

const FARM_NAME = 'Durian Farm — Nông trại Sầu riêng Thông minh';
/** Chủ vườn khai 120 cây -> seed provision đủ 120 mã QR; 16 cây mock là cây đã kích hoạt. */
const ESTIMATED_TREE_COUNT = 120;
const SEED_EMAILS = ['manager@durian.vn', 'worker@durian.vn', 'viewer@durian.vn'];
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'thailevan1974';

/** '15/09/2026' + '08:30' -> ISO. D3: DB chỉ lưu một cột timestamptz. */
function toIso(date: string, time?: string): string {
  const [d, m, y] = date.split('/');
  return new Date(`${y}-${m}-${d}T${time ?? '00:00'}:00+07:00`).toISOString();
}

/** Liếp/mô suy ra từ block-row-position của sơ đồ vườn, khỏi khai trùng lặp. */
const bedName = (s?: TreeSpatialData) => (s ? `Liếp ${s.block}-${s.row.padStart(2, '0')}` : null);
const moundNumber = (s?: TreeSpatialData) => (s ? `Mô ${s.position.padStart(2, '0')}` : null);

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Không chạy seed trên production');

  await withTransaction(async (client) => {
    const b = DEFAULT_CADASTRAL_BENCHMARK;
    // Dọn lần seed trước. Tìm theo email tài khoản chứ không theo tên vườn: đổi tên vườn
    // vẫn phải dọn đúng row cũ, nếu không sẽ đụng unique(email). Cascade xuống trees/history/users.
    await client.query(
      `delete from farms where name = $1
         or id in (select farm_id from users where email = any($2))`,
      [FARM_NAME, SEED_EMAILS],
    );
    const farm = await client.query(
      `insert into farms (name, tech_lead, offline_sync_enabled, benchmark_code, benchmark_name,
         benchmark_lat, benchmark_lng, benchmark_elevation_m, benchmark_datum, benchmark_zone,
         benchmark_source, plot_number, address, estimated_tree_count)
       values ($1,$2,true,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning id`,
      [
        FARM_NAME, 'Lê Văn Thái', b.code, b.name, b.lat, b.lng,
        b.elevationMeters, b.datum, b.zone, b.source, b.plotNumber, b.address, ESTIMATED_TREE_COUNT,
      ],
    );
    const farmId = farm.rows[0].id;

    const hash = await hashPassword(SEED_PASSWORD);
    const accounts = [
      { email: 'manager@durian.vn', name: 'Lê Văn Thái', role: 'manager', block: null },
      { email: 'worker@durian.vn', name: 'Trần Đình Trọng', role: 'worker', block: 'A' },
      { email: 'viewer@durian.vn', name: 'Khách tham quan', role: 'viewer', block: null },
    ];
    const userIds: Record<string, string> = {};
    for (const a of accounts) {
      const r = await client.query(
        `insert into users (email, password_hash, full_name, role, farm_id, assigned_block)
         values ($1,$2,$3,$4,$5,$6) returning id`,
        [a.email, hash, a.name, a.role, farmId, a.block],
      );
      userIds[a.role] = r.rows[0].id;
    }

    let treeCount = 0;
    let historyCount = 0;
    for (const t of INITIAL_TREES) {
      const spatial = (TREE_SPATIAL_MAP as Record<string, any>)[t.id];
      const tree = await client.query(
        `insert into trees (farm_id, code, variety, planted_date, block, row_no, position_no, lat, lng,
           map_x, map_y, bed_name, mound_number, canopy_radius, status, health_score, soil_moisture,
           leaf_condition, flowering, flowering_stage, fruit_condition, fruit_count, height_meters,
           trunk_diameter_cm, image_url, notes, last_updated, last_updated_by, activated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,now())
         returning id`,
        [
          farmId, t.code, t.variety, t.plantedDate,
          spatial?.block ?? t.location?.block ?? null, spatial?.row ?? t.location?.row ?? null,
          spatial?.position ?? t.location?.position ?? null,
          spatial?.lat ?? t.location?.coordinates?.lat ?? null,
          spatial?.lng ?? t.location?.coordinates?.lng ?? null,
          spatial?.x ?? null, spatial?.y ?? null, bedName(spatial), moundNumber(spatial),
          spatial?.canopyRadius ?? 25,
          t.status, t.healthScore, t.soilMoisture, t.leafCondition, t.flowering, t.floweringStage ?? null,
          t.fruitCondition, t.fruitCount ?? null, t.heightMeters ?? null, t.trunkDiameterCm ?? null,
          t.image, t.notes ?? null, t.lastUpdated, t.lastUpdatedBy ?? null,
        ],
      );
      const treeId = tree.rows[0].id;
      treeCount++;

      for (const [i, url] of (t.gallery ?? []).entries()) {
        await client.query('insert into tree_images (tree_id, url, sort_order) values ($1,$2,$3)', [treeId, url, i]);
      }

      for (const h of t.history ?? []) {
        await client.query(
          `insert into tree_history (tree_id, occurred_at, activity, type, status, description, performer,
             dosage, measurements, images, created_by)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            treeId, toIso(h.date, h.time), h.activity, h.type, h.status ?? null, h.description,
            h.performer ?? null, h.dosage ?? null, h.measurements ? JSON.stringify(h.measurements) : null,
            h.images ?? [], userIds.manager,
          ],
        );
        historyCount++;
      }
    }

    // Chủ vườn khai 120 cây -> in sẵn 120 mã QR. 16 mã đầu đã là cây mock ở trên,
    // phần còn lại là mã trống chờ quét (activated_at = null).
    const provisioned = await client.query(
      `with target as (
         select 'SD-' || lpad(n::text, greatest(3, length(n::text)), '0') as code from generate_series(1, $2::int) as n
       )
       insert into trees (farm_id, code, status)
       select $1, code, 'unknown' from target
       on conflict (code) do nothing
       returning code`,
      [farmId, ESTIMATED_TREE_COUNT],
    );

    // Sơ đồ vườn có toạ độ cho cả các mã chưa kích hoạt -> gán luôn vị trí cho chúng.
    for (const s of Object.values(TREE_SPATIAL_MAP)) {
      await client.query(
        `update trees set block=$3, row_no=$4, position_no=$5, lat=$6, lng=$7, map_x=$8, map_y=$9,
           bed_name=$10, mound_number=$11, canopy_radius=$12
         where farm_id=$1 and code=$2`,
        [farmId, s.id, s.block, s.row, s.position, s.lat, s.lng, s.x, s.y,
          bedName(s), moundNumber(s), s.canopyRadius],
      );
    }

    // Danh mục vật tư — không có nó thì form cập nhật không chọn được gì, báo cáo trống.
    const materialIds: Record<string, string> = {};
    for (const m of SEED_MATERIALS) {
      const r = await client.query(
        `insert into materials (farm_id, code, name, type, unit, unit_price, notes)
         values ($1,$2,$3,$4,$5,$6,$7) returning id`,
        [farmId, m.code, m.name, m.type, m.unit, m.unitPrice, m.notes ?? null],
      );
      materialIds[m.code] = r.rows[0].id;
    }

    // Vài task mẫu quanh hôm nay để màn /plans có gì để nhìn.
    const day = (offset: number) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      return d.toISOString().slice(0, 10);
    };
    const plannedNpk = JSON.stringify([
      { materialId: materialIds['PB-001'], code: 'PB-001', name: 'NPK 16-16-8', quantity: 0.5, unit: 'kg', unitPrice: 24000 },
    ]);
    const sampleTasks: [string, string, string, string | null, string, string, string][] = [
      ['Bón thúc đợt 2 lô A', 'fertilizing', 'block', 'A', day(0), 'todo', plannedNpk],
      ['Kiểm tra sức khoẻ toàn vườn', 'health_check', 'farm', null, day(1), 'todo', '[]'],
      ['Phun phòng nấm Phytophthora lô B', 'spraying', 'block', 'B', day(3), 'todo', '[]'],
      ['Tưới bổ sung lô C', 'watering', 'block', 'C', day(-2), 'doing', '[]'],
      ['Cắt tỉa cành lô A', 'pruning', 'block', 'A', day(6), 'todo', '[]'],
    ];
    for (const [title, type, scope, block, dueDate, status, planned] of sampleTasks) {
      await client.query(
        `insert into tasks (farm_id, title, type, scope, block, due_date, status, assignee_id, planned_materials, created_by)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [farmId, title, type, scope, block, dueDate, status, block === 'A' ? userIds.worker : null, planned, userIds.manager],
      );
    }

    console.log(`✓ Vườn ${farmId}`);
    console.log(`✓ ${SEED_MATERIALS.length} vật tư, ${sampleTasks.length} kế hoạch mẫu`);
    console.log(`✓ ${provisioned.rowCount} mã QR trống (tổng ước tính ${ESTIMATED_TREE_COUNT})`);
    console.log(`✓ ${treeCount} cây, ${historyCount} bản ghi lịch sử`);
    console.log(`✓ 3 tài khoản (mật khẩu: ${SEED_PASSWORD}): ${accounts.map((a) => a.email).join(', ')}`);
    console.log(`  cây đầu tiên: ${INITIAL_TREES[0].code}, ${ageFromPlantedDate(INITIAL_TREES[0].plantedDate)} tuổi`);
  });

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
