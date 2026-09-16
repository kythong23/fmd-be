# 03 — DATABASE
### Dự án: Quản lý tình trạng cây sầu riêng qua mã QR

> **Schema dưới đây suy ra từ prototype tham chiếu** `durian-tree/src/types/durian.ts` và `durian-tree/src/data/farmMapData.ts`. Nguyên tắc: hình dạng `DurianTree` là **contract dùng chung FE + BE** (`04_API.md` §0) — DB ánh xạ 1-1 vào đó, giảm tối đa tầng chuyển đổi.
>
> Đề xuất **PostgreSQL** (Supabase hoặc Postgres tự dựng đều được).

---

## 1. Đối chiếu type FE ↔ bảng DB

| Type trong `types/durian.ts` | Bảng tương ứng |
|---|---|
| `DurianTree` | `trees` (+ `tree_images` cho `gallery`) |
| `Location` (`block`, `row`, `position`, `coordinates`) | các cột trong `trees` |
| `HistoryRecord` | `tree_history` (append-only) |
| `UpdateFormData` | payload của API tạo history — không phải bảng |
| `TreeStatus`, `DurianVariety`, `ConditionTag`, `ActionTaken` | `CHECK` constraint (xem mục 3) |
| `farmMapData.ts` (`FARM_BOUNDARY`, `FARM_BEDS`, `FARM_CANALS`, `FARM_FACILITIES`, `WATER_RESERVOIR`, `INTERNAL_ROADS`) | `farms.map_layers` (JSONB) — xem mục 4 |
| `CadastralBenchmark` | các cột `benchmark_*` trong `farms` |
| `TREE_SPATIAL_MAP` | `trees.map_x/map_y/bed_name/mound_number/canopy_radius` |

---

## 2. ERD

```
farms (1) ─── (N) trees ─── (N) tree_history
   │                │              │
   │                └─── (N) tree_images
   │                               │
users (N) ─────── created_by ──────┘
```

5 bảng. Không tách `farm_anchors`, `farm_beds`, `farm_canals`... thành bảng riêng: bản vẽ thửa đất là dữ liệu cấu hình đọc-cả-cụm, không truy vấn lẻ → để JSONB trong `farms` (xem mục 4).

---

## 3. Bảng `trees` — ánh xạ 1-1 với `DurianTree`

| Cột | Kiểu | Trường FE | Ghi chú |
|---|---|---|---|
| `id` | `uuid` PK | `id` | FE đang dùng `id === code` (mock); DB nên tách ra, API trả `code` cho FE |
| `farm_id` | `uuid` FK → farms | — | Chuẩn bị đa vườn |
| `code` | `text UNIQUE` | `code` | `SD-001` — **khóa tra cứu QR, truy vấn nóng nhất** |
| `variety` | `text` + CHECK | `variety` | `Ri6`, `Monthong (Dona)`, `Musang King`, `Black Thorn`, `Chuồng Bò` |
| `planted_date` | `date` | `plantedDate` | `age` **không lưu** — tính từ đây (FE đang lưu cả 2, dễ lệch) |
| `block` / `row_no` / `position_no` | `text` | `location.block/row/position` | Lô A/B/C, hàng, vị trí |
| `lat` / `lng` | `double precision` | `location.coordinates` | Nullable — mock có cây không có tọa độ |
| `map_x` / `map_y` | `numeric` | `TREE_SPATIAL_MAP[id].x/y` | Pixel trên bản vẽ SVG (hệ tọa độ 0–1000 × 0–700) |
| `bed_name` / `mound_number` | `text` | `bedName` / `moundNumber` | "Liếp A-02", "Mô 12" |
| `canopy_radius` | `numeric` | `canopyRadius` | Bán kính tán khi vẽ |
| `status` | `text` + CHECK | `status` | `healthy`/`monitoring`/`problem`/`unknown` |
| `health_score` | `int` CHECK 0–100 | `healthScore` | **BE tính**, không nhận từ client |
| `soil_moisture` | `numeric` | `soilMoisture` | % |
| `leaf_condition` | `text` + CHECK | `leafCondition` | `good`/`fair`/`poor`/`yellowing` |
| `flowering` | `boolean` | `flowering` | |
| `flowering_stage` | `text` | `floweringStage` | Mô tả tự do |
| `fruit_condition` | `text` + CHECK | `fruitCondition` | `developing`/`blooming`/`maturing`/`harvested`/`none` |
| `fruit_count` | `int` | `fruitCount` | |
| `height_meters` | `numeric(4,2)` | `heightMeters` | |
| `trunk_diameter_cm` | `numeric(5,2)` | `trunkDiameterCm` | |
| `image_url` | `text` | `image` | Ảnh đại diện |
| `notes` | `text` | `notes` | |
| `last_updated` | `timestamptz` | `lastUpdated` | |
| `last_updated_by` | `text` | `lastUpdatedBy` | Tên hiển thị (FE đang render tên người, không phải id) |
| `created_at` | `timestamptz` | — | |

**Index:**
- `UNIQUE (code)` — mọi lần quét QR đều tra bằng cột này.
- `INDEX (farm_id, block)` — Dashboard/QRManagement lọc theo lô A/B/C.
- `INDEX (farm_id, status)` — Dashboard đếm 4 nhóm trạng thái.

---

## 4. Bảng `farms` — thông tin vườn + mốc trắc địa + bản vẽ

| Cột | Kiểu | Nguồn trong source |
|---|---|---|
| `id` | `uuid` PK | |
| `name` | `text` | `FarmSettings.tsx` — "Durian Farm - Nông trại Sầu riêng Thông minh" |
| `tech_lead` | `text` | `FarmSettings.tsx` — kỹ thuật viên trưởng ca |
| `public_view_enabled` | `boolean` | **Mặc định `false`**, MVP không có UI bật (`09_DECISIONS.md` D1) — giữ cột cho giai đoạn sau |
| `offline_sync_enabled` | `boolean` | `FarmSettings.tsx` — đồng bộ ngoại tuyến |
| `benchmark_code` / `benchmark_name` | `text` | `CadastralBenchmark.code/name` (`M0-TT`) |
| `benchmark_lat` / `benchmark_lng` | `double precision` | `lat`/`lng` mốc trung tâm |
| `benchmark_elevation_m` | `numeric` | `elevationMeters` |
| `benchmark_datum` / `benchmark_zone` | `text` | `VN-2000 / WGS-84`, kinh tuyến trục |
| `benchmark_source` | `text` + CHECK | `google`/`manual`/`gps_device`/`default` |
| `plot_number` / `address` | `text` | "Thửa 142, Tờ 08", địa chỉ xã/huyện/tỉnh |
| `map_layers` | `jsonb` | **Toàn bộ** `FARM_BOUNDARY`, `BOUNDARY_SVG_PATH`, `FARM_BEDS`, `FARM_CANALS`, `INTERNAL_ROADS`, `FARM_FACILITIES`, `WATER_RESERVOIR` |
| `updated_at` | `timestamptz` | |

**Vì sao `map_layers` là JSONB, không tách bảng?** FE (`FarmMap.tsx`) luôn nạp cả cụm một lần để vẽ SVG, không bao giờ query "tìm mương có width > 10". Tách 5 bảng chỉ để join lại toàn bộ là công vô ích. Khi nào cần sửa từng liếp bằng UI riêng và truy vấn lẻ thì mới tách.

> Hiện FE lưu mốc trắc địa ở `localStorage['durian_cadastral_benchmark']` → khi có DB, chuyển sang đọc/ghi qua API (mỗi người dùng phải thấy cùng một mốc, không phải mốc riêng trên máy mình).

---

## 5. Bảng `tree_history` — ánh xạ `HistoryRecord` (chỉ INSERT)

| Cột | Kiểu | Trường FE |
|---|---|---|
| `id` | `uuid` PK | `id` |
| `tree_id` | `uuid` FK → trees ON DELETE CASCADE | |
| `occurred_at` | `timestamptz NOT NULL` | thay cho cặp `date` + `time` |
| `activity` | `text` | `activity` — nhãn tiếng Việt hiển thị thẳng |
| `type` | `text` + CHECK | `health_check`/`watering`/`fertilizing`/`spraying`/`pruning`/`treatment`/`harvest` |
| `status` | `text` + CHECK, nullable | `status` tại thời điểm ghi nhận |
| `description` | `text NOT NULL` | `description` |
| `performer` | `text` | `performer` |
| `dosage` | `text` | `dosage` — "NPK 16-16-8 (350g) + 2kg phân trùn quế" |
| `measurements` | `jsonb` | `{height, trunkDiameter, soilMoisture, fruitCount}` |
| `images` | `text[]` | `images` |
| `conditions` | `text[]` | `ConditionTag[]` từ `UpdateFormData` — **FE đang gửi nhưng bị mất, chưa lưu** |
| `action_taken` | `text` + CHECK | `ActionTaken` — nguồn để sinh `activity` |
| `notes` | `text` | `notes` từ form |
| `created_by` | `uuid` FK → users | audit |
| `client_request_id` | `text UNIQUE` nullable | chống ghi trùng khi submit lại lúc mất sóng |

**Quan trọng — `occurred_at` thay `date`+`time`:** FE đang lưu `'15/09/2026'` + `'08:30'` thành 2 chuỗi rời, khiến `FarmActivity.tsx` phải sort bằng `id.localeCompare` và **ra sai thứ tự**. DB lưu 1 cột `timestamptz`, API format lại `date`/`time` cho FE nếu muốn giữ nguyên component.

**Chỉ INSERT, không UPDATE/DELETE** — muốn "sửa" thì ghi bản ghi mới. Đây là hồ sơ VietGAP/truy xuất nguồn gốc.

**Index:**
- `INDEX (tree_id, occurred_at DESC)` — timeline của 1 cây (`TreeHistory.tsx`).
- `INDEX (occurred_at DESC)` — feed toàn vườn (`FarmActivity.tsx`).
- `INDEX (type)` — bộ lọc theo loại hoạt động.

---

## 6. `tree_images` & `users`

`tree_images`: `id`, `tree_id`, `url`, `sort_order`, `created_at` — phục vụ `gallery` ở `TreePassport`. (Có thể dùng `text[]` trong `trees` cho gọn; tách bảng khi cần metadata ảnh như người chụp / thời điểm.)

`users`: `id`, `full_name`, `role` CHECK (`manager`/`worker`/`viewer`), `farm_id`, `assigned_block` (khu vực phụ trách — khớp `trees.block`), `created_at`.

> Source hiện tại **chưa có user nào** — tên người thực hiện đang là chuỗi gõ tay trong `UpdateTreeModal` ("Nguyễn Văn An (Kỹ thuật viên)"). Khi có đăng nhập: `performer` lấy từ tài khoản, ô nhập tay chỉ giữ cho trường hợp ghi hộ.

---

## 7. DDL rút gọn (PostgreSQL)

```sql
create table farms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tech_lead text,
  public_view_enabled boolean default false,  -- D1: MVP luôn bắt buộc đăng nhập
  offline_sync_enabled boolean default true,
  benchmark_code text default 'M0-TT',
  benchmark_name text,
  benchmark_lat double precision not null,
  benchmark_lng double precision not null,
  benchmark_elevation_m numeric,
  benchmark_datum text default 'VN-2000 / WGS-84',
  benchmark_zone text,
  benchmark_source text check (benchmark_source in ('google','manual','gps_device','default')) default 'default',
  plot_number text,
  address text,
  map_layers jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table users (
  id uuid primary key,
  full_name text not null,
  role text not null check (role in ('manager','worker','viewer')),
  farm_id uuid references farms(id),
  assigned_block text,
  created_at timestamptz default now()
);

create table trees (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  code text not null unique,
  variety text not null check (variety in ('Ri6','Monthong (Dona)','Musang King','Black Thorn','Chuồng Bò')),
  planted_date date not null,
  block text, row_no text, position_no text,
  lat double precision, lng double precision,
  map_x numeric, map_y numeric,
  bed_name text, mound_number text, canopy_radius numeric default 25,
  status text not null check (status in ('healthy','monitoring','problem','unknown')) default 'unknown',
  health_score int check (health_score between 0 and 100),
  soil_moisture numeric,
  leaf_condition text check (leaf_condition in ('good','fair','poor','yellowing')),
  flowering boolean default false,
  flowering_stage text,
  fruit_condition text check (fruit_condition in ('developing','blooming','maturing','harvested','none')),
  fruit_count int,
  height_meters numeric(4,2),
  trunk_diameter_cm numeric(5,2),
  image_url text,
  notes text,
  last_updated timestamptz default now(),
  last_updated_by text,
  created_at timestamptz default now()
);
create index idx_trees_farm_block on trees(farm_id, block);
create index idx_trees_farm_status on trees(farm_id, status);

create table tree_images (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  url text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table tree_history (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  activity text not null,
  type text not null check (type in ('health_check','watering','fertilizing','spraying','pruning','treatment','harvest')),
  status text check (status in ('healthy','monitoring','problem','unknown')),
  description text not null,
  performer text,
  dosage text,
  measurements jsonb,
  images text[] default '{}',
  conditions text[] default '{}',
  action_taken text check (action_taken in ('watering','fertilizing','spraying','pruning','treatment','none')),
  notes text,
  created_by uuid references users(id),
  client_request_id text unique,
  created_at timestamptz default now()
);
create index idx_history_tree on tree_history(tree_id, occurred_at desc);
create index idx_history_feed on tree_history(occurred_at desc);
create index idx_history_type on tree_history(type);
```

---

## 8. Seed dữ liệu từ mock

`src/data/mockTrees.ts` đã có **16 cây SD-001…SD-016** kèm lịch sử đầy đủ, `farmMapData.ts` có sẵn bản vẽ thửa đất 2,8 ha. Viết một script `seed.ts` đọc 2 file này rồi INSERT:
1. `farms` ← `DEFAULT_CADASTRAL_BENCHMARK` + gom các hằng bản vẽ thành `map_layers`.
2. `trees` ← `INITIAL_TREES` join `TREE_SPATIAL_MAP` theo `id`.
3. `tree_history` ← `tree.history`, ghép `date` + `time` thành `occurred_at` (`dd/mm/yyyy` + `HH:mm` → ISO).
4. `tree_images` ← `tree.gallery`.

Như vậy môi trường dev có dữ liệu thật giống demo, không phải nhập tay. FE mới **không** đọc 2 file này — chúng chỉ là nguồn seed DB (`09_DECISIONS.md` D3).

---

## 9. RLS (nếu dùng Supabase)

Bật RLS như **lớp phòng vệ thứ 2**, không thay cho kiểm tra ở BE:
- `trees`, `tree_history`: `SELECT` cho mọi user đã đăng nhập cùng `farm_id`.
- `tree_history`: `INSERT` chỉ cho `manager`, hoặc `worker` có `assigned_block = trees.block`.
- `farms`: `UPDATE` chỉ `manager` (mốc trắc địa lệch là cả bản đồ lệch).

Viết test cho từng policy — RLS sai không hề báo lỗi, chỉ lặng lẽ trả thiếu/thừa dữ liệu.

---

## 10. Checklist

- [ ] 5 bảng + đủ index như mục 7.
- [ ] `trees.code` unique và là khóa tra cứu QR duy nhất.
- [ ] `tree_history.occurred_at` là `timestamptz` (không lặp lại lỗi tách `date`/`time` của FE).
- [ ] `conditions` và `action_taken` được lưu — hiện FE gửi lên nhưng chưa có chỗ chứa.
- [ ] `client_request_id` unique, đã test submit trùng 2 lần chỉ ra 1 bản ghi.
- [ ] Seed xong 16 cây + lịch sử từ mock, mở app lên thấy đúng như bản demo.
- [ ] `health_score` chỉ do BE ghi, client gửi lên bị bỏ qua.
- [ ] RLS test đủ 3 vai trò (nếu dùng Supabase).
- [ ] Đã bật backup định kỳ.
