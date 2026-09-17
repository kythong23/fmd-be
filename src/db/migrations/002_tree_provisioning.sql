-- 002 — chủ vườn ước lượng tổng số cây, hệ thống tạo sẵn bấy nhiêu mã QR.
-- Cây tạo sẵn chưa biết giống/ngày trồng → 2 cột đó phải cho phép null.
alter table farms add column if not exists estimated_tree_count int not null default 0;

alter table trees alter column variety drop not null;
alter table trees alter column planted_date drop not null;

-- null = mã QR đã in nhưng chưa ai quét & điền thông tin.
alter table trees add column if not exists activated_at timestamptz;
update trees set activated_at = created_at where activated_at is null and variety is not null;
