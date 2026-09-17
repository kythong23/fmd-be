-- 004 — xoá vườn (cascade xuống users) bị chặn bởi tree_history.created_by.
-- Lịch sử phải sống lâu hơn tài khoản người ghi: giữ bản ghi, chỉ bỏ tham chiếu.
alter table tree_history drop constraint if exists tree_history_created_by_fkey;
alter table tree_history add constraint tree_history_created_by_fkey
  foreign key (created_by) references users(id) on delete set null;
