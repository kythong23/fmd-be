-- 007_mvp_plus — danh mục vật tư + vật tư đã dùng + kế hoạch (03_DATABASE §6b/6c, D7/D8)

create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  code text not null,
  name text not null,
  type text not null check (type in ('fertilizer','pesticide','fungicide','herbicide','stimulant','other')),
  unit text not null,
  unit_price numeric(14,2),
  active boolean not null default true,   -- D8: soft-delete, không DELETE cứng
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (farm_id, code)
);
create index if not exists idx_materials_farm_type on materials(farm_id, type, active);

-- D8: snapshot {materialId, code, name, quantity, unit, unitPrice}. Mặc định '[]' (KHÔNG null:
-- jsonb_array_elements(null) làm rơi dòng khỏi báo cáo).
alter table tree_history add column if not exists materials jsonb not null default '[]'::jsonb;
update tree_history set materials = '[]'::jsonb where materials is null;

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  title text not null,
  type text not null check (type in ('health_check','watering','fertilizing','spraying','pruning','treatment','harvest')),
  scope text not null check (scope in ('farm','block','tree')),
  block text,
  tree_id uuid references trees(id) on delete cascade,
  due_date date not null,
  status text not null check (status in ('todo','doing','done','cancelled')) default 'todo',
  assignee_id uuid references users(id) on delete set null,
  planned_materials jsonb not null default '[]'::jsonb,
  notes text,
  done_history_id uuid references tree_history(id),
  created_by uuid references users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (scope <> 'block' or block is not null),
  check (scope <> 'tree'  or tree_id is not null),
  check (status <> 'done' or done_history_id is not null)
);
create index if not exists idx_tasks_due on tasks(farm_id, due_date);
create index if not exists idx_tasks_status on tasks(farm_id, status, due_date);
create index if not exists idx_tasks_assignee on tasks(assignee_id, status);
