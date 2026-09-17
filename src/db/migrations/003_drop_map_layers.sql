-- 003 — bản vẽ thửa đất (ranh giới, liếp, mương, đường nội bộ, hồ, công trình)
-- chuyển sang hard-code ở FE: dữ liệu tĩnh, không ai sửa qua API.
alter table farms drop column if exists map_layers;
