-- 008 — api_log: lưu user agent để màn log biết request đến từ app/trình duyệt/curl nào.
alter table api_log add column if not exists user_agent text;
