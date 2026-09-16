-- 001_init — schema theo instruction/03_DATABASE.md §7
create extension if not exists pgcrypto;

create table if not exists farms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tech_lead text,
  public_view_enabled boolean not null default false,  -- D1: MVP luôn bắt buộc đăng nhập
  offline_sync_enabled boolean not null default true,
  benchmark_code text default 'M0-TT',
  benchmark_name text,
  benchmark_lat double precision not null,
  benchmark_lng double precision not null,
  benchmark_elevation_m numeric,
  benchmark_datum text default 'VN-2000 / WGS-84',
  benchmark_zone text,
  benchmark_source text check (benchmark_source in ('google','manual','gps_device','default')) default 'default',
  benchmark_updated_at timestamptz default now(),
  plot_number text,
  address text,
  map_layers jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,          -- thêm so với 03_DATABASE §6: cần định danh đăng nhập
  password_hash text not null,         -- thêm: JWT tự phát hành (06_BACKEND §5)
  token_version int not null default 0,-- bump khi logout-all / đổi mật khẩu
  full_name text not null,
  role text not null check (role in ('manager','worker','viewer')),
  farm_id uuid references farms(id) on delete cascade,
  assigned_block text,
  created_at timestamptz default now()
);

create table if not exists trees (
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
create index if not exists idx_trees_farm_block on trees(farm_id, block);
create index if not exists idx_trees_farm_status on trees(farm_id, status);

create table if not exists tree_images (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references trees(id) on delete cascade,
  url text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);
create index if not exists idx_tree_images_tree on tree_images(tree_id, sort_order);

create table if not exists tree_history (
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
create index if not exists idx_history_tree on tree_history(tree_id, occurred_at desc);
create index if not exists idx_history_feed on tree_history(occurred_at desc);
create index if not exists idx_history_type on tree_history(type);
