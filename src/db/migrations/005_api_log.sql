-- 005 — nhật ký API: trace ngược 1 cây/người dùng đã đi qua những API nào khi có lỗi.
-- subjects = các "đối tượng dữ liệu" request này chạm vào ('tree:DR-001', 'user:<uuid>', 'farm:<uuid>').
create table if not exists api_log (
  id bigserial primary key,
  request_id text not null,
  ts timestamptz not null default now(),
  user_id uuid references users(id) on delete set null,
  user_email text,
  method text not null,
  path text not null,
  status int not null,
  duration_ms int not null,
  ip text,
  subjects text[] not null default '{}',
  payload jsonb,
  response jsonb,
  error_code text,
  error_stack text
);

create index if not exists idx_api_log_ts on api_log(ts desc);
create index if not exists idx_api_log_subjects on api_log using gin(subjects);
create index if not exists idx_api_log_errors on api_log(ts desc) where status >= 400;
create index if not exists idx_api_log_request on api_log(request_id);
