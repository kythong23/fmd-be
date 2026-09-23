-- 009 — danh mục cây giống: giá + giống đang dùng (03_DATABASE §6b2, D10).
-- KHÔNG FK tới trees.variety và KHÔNG unique (farm_id, name): trùng tên là hợp lệ (hai nguồn giống cùng gọi "Ri6").
create table if not exists varieties (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  name text not null,
  unit_price numeric(14,2),               -- VND/cây, null = chưa có giá
  active boolean not null default true,   -- soft-delete, cùng quy tắc D8
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_varieties_farm_active on varieties(farm_id, active);
