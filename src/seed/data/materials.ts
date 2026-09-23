/**
 * Danh mục vật tư thật đang dùng ở vườn sầu riêng (03_DATABASE §8 mục 5) — mock không có.
 * Không có danh mục thì form cập nhật không chọn được gì và báo cáo trống.
 * Đơn giá tham khảo 2026, VND theo đơn vị tính.
 */
import type { MaterialType } from '../../types/durian.js';

export interface SeedMaterial {
  code: string;
  name: string;
  type: MaterialType;
  unit: string;
  unitPrice: number | null;
  notes?: string;
}

export const SEED_MATERIALS: SeedMaterial[] = [
  { code: 'PB-001', name: 'NPK 16-16-8', type: 'fertilizer', unit: 'kg', unitPrice: 24000, notes: 'Bón thúc giai đoạn phát triển thân lá' },
  { code: 'PB-002', name: 'NPK 20-20-15', type: 'fertilizer', unit: 'kg', unitPrice: 26500, notes: 'Bón nuôi trái' },
  { code: 'PB-003', name: 'NPK 12-12-17+TE', type: 'fertilizer', unit: 'kg', unitPrice: 27000, notes: 'Giai đoạn tạo cơm, tăng chất lượng trái' },
  { code: 'PB-004', name: 'Phân trùn quế', type: 'fertilizer', unit: 'kg', unitPrice: 6500, notes: 'Cải tạo đất quanh gốc, 10-20kg/gốc/năm' },
  { code: 'PB-005', name: 'Phân bò hoai mục', type: 'fertilizer', unit: 'kg', unitPrice: 3000 },
  { code: 'PB-006', name: 'Phân gà vi sinh Nhật', type: 'fertilizer', unit: 'bao', unitPrice: 165000, notes: 'Bao 25kg' },
  { code: 'PB-007', name: 'Kali sulfat (K2SO4)', type: 'fertilizer', unit: 'kg', unitPrice: 32000, notes: 'Trước thu hoạch, tăng độ ngọt' },
  { code: 'PB-008', name: 'Lân Văn Điển', type: 'fertilizer', unit: 'kg', unitPrice: 9000 },
  { code: 'PB-009', name: 'Vôi bột CaCO3', type: 'fertilizer', unit: 'kg', unitPrice: 3500, notes: 'Nâng pH đất đầu mùa mưa' },
  { code: 'TS-001', name: 'Ridomil Gold 68WG', type: 'fungicide', unit: 'gói', unitPrice: 42000, notes: 'Gói 100g — phòng Phytophthora, pha 30-50g/16L' },
  { code: 'TS-002', name: 'Aliette 800WG', type: 'fungicide', unit: 'gói', unitPrice: 58000, notes: 'Gói 100g — xì mủ thân' },
  { code: 'TS-003', name: 'Antracol 70WP', type: 'fungicide', unit: 'kg', unitPrice: 215000, notes: 'Thán thư, đốm lá' },
  { code: 'TS-004', name: 'Agri-Fos 400', type: 'fungicide', unit: 'lít', unitPrice: 285000, notes: 'Tiêm thân / quét gốc trị nứt thân xì mủ' },
  { code: 'TS-005', name: 'Confidor 200SL', type: 'pesticide', unit: 'chai', unitPrice: 95000, notes: 'Chai 100ml — rầy nhảy, rệp sáp' },
  { code: 'TS-006', name: 'Abamectin 1.8EC', type: 'pesticide', unit: 'chai', unitPrice: 62000, notes: 'Chai 100ml — nhện đỏ, sâu ăn lá' },
  { code: 'TS-007', name: 'Dầu khoáng SK Enspray 99EC', type: 'pesticide', unit: 'lít', unitPrice: 145000, notes: 'Phun phòng rệp sáp giai đoạn trái non' },
  { code: 'TS-008', name: 'Glyphosate 480SL', type: 'herbicide', unit: 'lít', unitPrice: 78000, notes: 'Chỉ dùng lối đi, KHÔNG phun quanh gốc' },
  { code: 'KT-001', name: 'Paclobutrazol 10WP', type: 'stimulant', unit: 'kg', unitPrice: 320000, notes: 'Xử lý ra hoa nghịch vụ — dùng đúng liều, lạm dụng làm suy cây' },
  { code: 'KT-002', name: 'Bo (Boron) dạng lỏng', type: 'stimulant', unit: 'lít', unitPrice: 120000, notes: 'Phun giai đoạn mắt cua, chống rụng bông' },
  { code: 'VT-001', name: 'Màng phủ gốc / bạt che', type: 'other', unit: 'm2', unitPrice: null, notes: 'Vật tư tự có — chưa nhập giá' },
  // Cây giống (D11) — đúng các giống đang có trong trees.variety.
  { code: 'GC-001', name: 'Ri6', type: 'variety', unit: 'cây', unitPrice: 45000, notes: 'Giống chủ lực' },
  { code: 'GC-002', name: 'Monthong (Dona)', type: 'variety', unit: 'cây', unitPrice: 55000 },
  { code: 'GC-003', name: 'Musang King', type: 'variety', unit: 'cây', unitPrice: 120000 },
  { code: 'GC-004', name: 'Black Thorn', type: 'variety', unit: 'cây', unitPrice: 250000 },
  { code: 'GC-005', name: 'Chuồng Bò', type: 'variety', unit: 'cây', unitPrice: null, notes: 'Chưa có giá' },
];
