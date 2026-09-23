-- 010 — D11 thay D10: cây giống là một `type` của materials ('variety'), không có bảng/API riêng.
alter table materials drop constraint if exists materials_type_check;
alter table materials add constraint materials_type_check
  check (type in ('fertilizer','pesticide','fungicide','herbicide','stimulant','variety','other'));

-- Chuyển dữ liệu đã nhập ở bảng varieties (009) sang materials, mã tự đặt GC-001, GC-002...
do $$
begin
  if to_regclass('public.varieties') is not null then
    insert into materials (farm_id, code, name, type, unit, unit_price, active, notes, created_at, updated_at)
    select farm_id,
           'GC-' || lpad(row_number() over (partition by farm_id order by created_at, name)::text, 3, '0'),
           name, 'variety', 'cây', unit_price, active, notes, created_at, updated_at
    from varieties
    on conflict (farm_id, code) do nothing;
    drop table varieties;
  end if;
end $$;
