-- 011 — PATCH /trees/:code lần đầu (kích hoạt cây) ghi 1 dòng lịch sử type 'activation'
-- để biết ngày khai hồ sơ cây. tasks.type giữ nguyên: không lên lịch việc "kích hoạt".
alter table tree_history drop constraint if exists tree_history_type_check;
alter table tree_history add constraint tree_history_type_check
  check (type in ('health_check','watering','fertilizing','spraying','pruning','treatment','harvest','activation'));
