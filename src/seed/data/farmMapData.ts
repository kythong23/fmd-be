export interface FarmBoundaryPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  lat: number;
  lng: number;
}

export interface TreeSpatialData {
  id: string;
  x: number;
  y: number;
  bedName: string; // e.g. "Liếp A-02"
  moundNumber: string; // "Mô 12"
  canopyRadius: number; // visual canopy radius
}

export interface FarmFacility {
  id: string;
  name: string;
  category: 'gate' | 'office' | 'warehouse' | 'pump' | 'weather' | 'qc';
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  icon: string;
}

export interface FarmCanal {
  id: string;
  name: string;
  path: string;
  width: number;
}

export interface FarmBed {
  id: string;
  block: 'A' | 'B' | 'C';
  name: string;
  path: string;
  color?: string;
}

// Cadastral Bounding Polygon (2.8 Hectares - Thửa đất 142, Tờ bản đồ số 08)
export const FARM_BOUNDARY: FarmBoundaryPoint[] = [
  { id: 'M1', name: 'Mốc M1 (Tây Bắc)', x: 60, y: 70, lat: 10.4642, lng: 107.2135 },
  { id: 'M2', name: 'Mốc M2 (Đông Bắc)', x: 940, y: 55, lat: 10.4645, lng: 107.2210 },
  { id: 'M3', name: 'Mốc M3 (Đông Nam)', x: 960, y: 620, lat: 10.4578, lng: 107.2215 },
  { id: 'M4', name: 'Mốc M4 (Cổng chính)', x: 540, y: 650, lat: 10.4575, lng: 107.2175 },
  { id: 'M5', name: 'Mốc M5 (Tây Nam)', x: 80, y: 640, lat: 10.4576, lng: 107.2138 },
  { id: 'M6', name: 'Mốc M6 (Eo Suối)', x: 40, y: 350, lat: 10.4610, lng: 107.2132 },
];

export const BOUNDARY_SVG_PATH = "M 60,70 L 940,55 L 960,620 L 540,650 L 80,640 L 40,350 Z";

// Spatial mapping of each of the 16 trees in mock data to realistic plantation beds
export const TREE_SPATIAL_MAP: Record<string, TreeSpatialData> = {
  'SD-001': { id: 'SD-001', x: 680, y: 535, bedName: 'Liếp A-01', moundNumber: 'Mô 12', canopyRadius: 26 },
  'SD-002': { id: 'SD-002', x: 790, y: 535, bedName: 'Liếp A-01', moundNumber: 'Mô 14', canopyRadius: 28 },
  'SD-003': { id: 'SD-003', x: 650, y: 445, bedName: 'Liếp A-02', moundNumber: 'Mô 02', canopyRadius: 24 },
  'SD-004': { id: 'SD-004', x: 760, y: 445, bedName: 'Liếp A-02', moundNumber: 'Mô 05', canopyRadius: 25 },
  'SD-005': { id: 'SD-005', x: 870, y: 445, bedName: 'Liếp A-02', moundNumber: 'Mô 08', canopyRadius: 24 },
  'SD-006': { id: 'SD-006', x: 690, y: 220, bedName: 'Liếp B-01', moundNumber: 'Mô 03', canopyRadius: 22 },
  'SD-007': { id: 'SD-007', x: 830, y: 220, bedName: 'Liếp B-01', moundNumber: 'Mô 09', canopyRadius: 31 },
  'SD-008': { id: 'SD-008', x: 660, y: 135, bedName: 'Liếp B-02', moundNumber: 'Mô 04', canopyRadius: 24 },
  'SD-009': { id: 'SD-009', x: 780, y: 135, bedName: 'Liếp B-02', moundNumber: 'Mô 11', canopyRadius: 25 },
  'SD-016': { id: 'SD-016', x: 890, y: 135, bedName: 'Liếp B-02', moundNumber: 'Mô 16', canopyRadius: 24 },
  'SD-010': { id: 'SD-010', x: 190, y: 515, bedName: 'Liếp C-01', moundNumber: 'Mô 02', canopyRadius: 28 },
  'SD-011': { id: 'SD-011', x: 310, y: 515, bedName: 'Liếp C-01', moundNumber: 'Mô 07', canopyRadius: 23 },
  'SD-012': { id: 'SD-012', x: 150, y: 365, bedName: 'Liếp C-02', moundNumber: 'Mô 05', canopyRadius: 25 },
  'SD-013': { id: 'SD-013', x: 270, y: 365, bedName: 'Liếp C-02', moundNumber: 'Mô 10', canopyRadius: 34 },
  'SD-014': { id: 'SD-014', x: 170, y: 205, bedName: 'Liếp C-03', moundNumber: 'Mô 03', canopyRadius: 21 },
  'SD-015': { id: 'SD-015', x: 300, y: 205, bedName: 'Liếp C-03', moundNumber: 'Mô 08', canopyRadius: 27 },
};

// Farm Facilities
export const FARM_FACILITIES: FarmFacility[] = [
  {
    id: 'fac-gate',
    name: 'Cổng trang trại chính',
    category: 'gate',
    x: 470,
    y: 635,
    width: 60,
    height: 24,
    label: 'Cổng vào & Kiểm soát QR',
    icon: 'DoorOpen'
  },
  {
    id: 'fac-office',
    name: 'Nhà điều hành trung tâm',
    category: 'office',
    x: 420,
    y: 565,
    width: 55,
    height: 40,
    label: 'Nhà điều hành & Trưng bày',
    icon: 'Building2'
  },
  {
    id: 'fac-warehouse',
    name: 'Kho vật tư phân bón & Chế phẩm',
    category: 'warehouse',
    x: 490,
    y: 565,
    width: 65,
    height: 40,
    label: 'Kho phân bón VietGAP',
    icon: 'Warehouse'
  },
  {
    id: 'fac-weather',
    name: 'Trạm khí tượng quan trắc IoT',
    category: 'weather',
    x: 575,
    y: 575,
    width: 32,
    height: 32,
    label: 'Trạm IoT thời tiết',
    icon: 'SunDim'
  },
  {
    id: 'fac-pump',
    name: 'Trạm bơm tưới tự động & Châm phân',
    category: 'pump',
    x: 585,
    y: 320,
    width: 38,
    height: 35,
    label: 'Trạm bơm bù áp 15HP',
    icon: 'Gauge'
  },
  {
    id: 'fac-qc',
    name: 'Khu sơ chế & Đóng gói sầu riêng',
    category: 'qc',
    x: 350,
    y: 575,
    width: 55,
    height: 35,
    label: 'Khu sơ chế & Dán tem QR',
    icon: 'CheckCircle2'
  }
];

// Water reservoir (Ao sinh thái trữ nước ngọt)
export const WATER_RESERVOIR = {
  cx: 510,
  cy: 330,
  rx: 75,
  ry: 95,
  name: 'Hồ sinh thái trữ nước ngọt (3.000 m³)',
  depth: '3.5m',
  waterQuality: 'pH 6.8 • Độ mặn 0‰'
};

// Canals (Mương xẻ rãnh giữa các liếp)
export const FARM_CANALS = [
  // Western Creek (Rạch Bà Khá tự nhiên bên trái)
  { id: 'canal-west', name: 'Rạch tự nhiên (Biên giới Tây)', path: 'M 45,65 Q 30,340 65,630', width: 14 },
  // North Drainage Canal
  { id: 'canal-north', name: 'Kênh thủy lợi liên vùng (Bắc)', path: 'M 60,65 L 940,50', width: 12 },
  // Canals between rows in Block C
  { id: 'canal-c1', name: 'Mương C1 (giữa liếp C1 - C2)', path: 'M 100,440 L 400,440', width: 8 },
  { id: 'canal-c2', name: 'Mương C2 (giữa liếp C2 - C3)', path: 'M 95,285 L 400,285', width: 8 },
  // Central Main Canal connecting pond to south & north
  { id: 'canal-center-n', name: 'Kênh dẫn nước Bắc - Hồ', path: 'M 510,75 L 510,230', width: 10 },
  { id: 'canal-center-s', name: 'Mương thoát hạ lưu Nam', path: 'M 510,430 L 510,540', width: 10 },
  // Canals between rows in Block A & B
  { id: 'canal-ab-mid', name: 'Mương B1-B2', path: 'M 600,180 L 930,180', width: 8 },
  { id: 'canal-a1', name: 'Mương A1-A2', path: 'M 600,490 L 940,490', width: 8 },
  { id: 'canal-a2', name: 'Mương A2-Hồ', path: 'M 600,390 L 940,390', width: 8 },
];

// Raised beds (Liếp sầu riêng mô đất)
export const FARM_BEDS = [
  { id: 'bed-c3', block: 'C', name: 'Liếp C-03 (Cây 4-6 năm)', x: 95, y: 165, w: 300, h: 80 },
  { id: 'bed-c2', block: 'C', name: 'Liếp C-02 (Cây Cổ Thụ & Chuồng Bò)', x: 90, y: 325, w: 305, h: 80 },
  { id: 'bed-c1', block: 'C', name: 'Liếp C-01 (Monthong & Musang King)', x: 95, y: 475, w: 300, h: 80 },
  { id: 'bed-b2', block: 'B', name: 'Liếp B-02 (Ri6 & Musang King)', x: 615, y: 95, w: 320, h: 80 },
  { id: 'bed-b1', block: 'B', name: 'Liếp B-01 (Black Thorn & Monthong VIP)', x: 615, y: 180, w: 320, h: 80 },
  { id: 'bed-a2', block: 'A', name: 'Liếp A-02 (Ri6 & Musang King)', x: 615, y: 405, w: 325, h: 80 },
  { id: 'bed-a1', block: 'A', name: 'Liếp A-01 (Ri6 & Monthong Dona)', x: 630, y: 495, w: 310, h: 80 },
];

// Main internal farm road running south to north
export const INTERNAL_ROADS = [
  // South road / frontage
  'M 80,640 L 960,620',
  // Main spine road passing by gate and lake
  'M 470,640 L 470,550 Q 460,330 460,200 L 460,70',
  // Cross path to Block A & B
  'M 470,550 L 610,550 L 930,550',
  // Cross path to Block C
  'M 470,550 L 400,550 L 100,550',
];

// Simulated initial farmer GPS position on the map
export const INITIAL_FARMER_LOCATION = {
  x: 470,
  y: 530,
  label: 'Vị trí hiện tại của bạn',
  technician: 'KTV. Nguyễn Văn An'
};

// ==========================================
// CADASTRAL CENTRAL BENCHMARK (MỐC TRẮC ĐỊA TRUNG TÂM)
// ==========================================

export interface CadastralBenchmark {
  code: string;
  name: string;
  plotNumber: string;
  address: string;
  lat: number;
  lng: number;
  elevationMeters: number;
  datum: string;
  zone: string;
  updatedAt: string;
  source: 'google' | 'manual' | 'gps_device' | 'default';
}

export const DEFAULT_CADASTRAL_BENCHMARK: CadastralBenchmark = {
  code: 'M0-TT',
  name: 'Mốc trắc địa trung tâm vườn',
  plotNumber: 'Thửa 35, Tờ 24',
  address: 'Phường Hàng Gòn, TP. Long Khánh, tỉnh Đồng Nai',
  lat: 10.8734664,
  lng: 107.2065857,
  elevationMeters: 42.5,
  datum: 'VN-2000 / WGS-84',
  zone: 'Kinh tuyến trục 107°45\'',
  updatedAt: '2026-03-10',
  source: 'default',
};

// Preset locations for quick selection
export interface LocationPreset {
  id: string;
  title: string;
  region: string;
  province: string;
  lat: number;
  lng: number;
  description: string;
  typicalVarieties: string;
}

export const VIETNAM_DURIAN_REGIONS: LocationPreset[] = [
  {
    id: 'cai-be',
    title: 'Cái Bè - Tiền Giang (Mặc định)',
    region: 'Đồng bằng Sông Cửu Long',
    province: 'Tiền Giang',
    lat: 10.4604,
    lng: 107.2165,
    description: 'Vùng chuyên canh sầu riêng Ri6 & Monthong ven sông Tiền, đất phù sa cổ.',
    typicalVarieties: 'Ri6, Monthong Dona'
  },
  {
    id: 'cho-lach',
    title: 'Chợ Lách - Bến Tre (Cái Mơn)',
    region: 'Đồng bằng Sông Cửu Long',
    province: 'Bến Tre',
    lat: 10.2568,
    lng: 106.1824,
    description: 'Cái nôi giống cây ăn trái và sầu riêng Chín Hóa, Ri6 Nam Bộ.',
    typicalVarieties: 'Chín Hóa, Ri6, Musang King'
  },
  {
    id: 'krong-pac',
    title: 'Krông Pắc - Đắk Lắk (Tây Nguyên)',
    region: 'Tây Nguyên',
    province: 'Đắk Lắk',
    lat: 12.7214,
    lng: 108.2831,
    description: 'Thủ phủ sầu riêng xuất khẩu Đắk Lắk, đất đỏ bazan cao trình 500m.',
    typicalVarieties: 'Dona Đắk Lắk, Black Thorn'
  },
  {
    id: 'doi-riu-ql56',
    title: 'Đồi Rìu - QL56, Hàng Gòn (Đồng Nai)',
    region: 'Đông Nam Bộ',
    province: 'Đồng Nai',
    lat: 10.8732,
    lng: 107.2158,
    description: 'Thửa đất sầu riêng dọc Quốc lộ 56 - Đồi Rìu, xã Hàng Gòn, TP. Long Khánh.',
    typicalVarieties: 'Ri6, Monthong Dona, Musang King'
  },
  {
    id: 'long-khanh',
    title: 'Long Khánh - Đồng Nai (Đông Nam Bộ)',
    region: 'Đông Nam Bộ',
    province: 'Đồng Nai',
    lat: 10.9382,
    lng: 107.2415,
    description: 'Vùng trái cây nhiệt đới nổi tiếng đất đỏ Long Khánh, thu hoạch sớm.',
    typicalVarieties: 'Ri6, Monthong, Chuồng Bò'
  },
  {
    id: 'phong-dien',
    title: 'Phong Điền - Cần Thơ',
    region: 'Đồng bằng Sông Cửu Long',
    province: 'Cần Thơ',
    lat: 9.9928,
    lng: 105.6792,
    description: 'Vườn sinh thái miệt vườn Cần Thơ với hệ thống đê bao khép kín.',
    typicalVarieties: 'Ri6 Phong Điền, Monthong'
  },
  {
    id: 'bao-loc',
    title: 'Bảo Lộc / Đạ Huoai - Lâm Đồng',
    region: 'Tây Nguyên',
    province: 'Lâm Đồng',
    lat: 11.5432,
    lng: 107.8123,
    description: 'Thung lũng sầu riêng Đạ Huoai - Bảo Lộc, khí hậu mát mẻ.',
    typicalVarieties: 'Monthong, Musang King, Ri6'
  }
];

// Calculate derived boundary points based on center benchmark offset
export function getDerivedBoundaryPoints(center: { lat: number; lng: number }): FarmBoundaryPoint[] {
  const baseCenterLat = 10.4604;
  const baseCenterLng = 107.2165;
  const dLat = center.lat - baseCenterLat;
  const dLng = center.lng - baseCenterLng;

  return FARM_BOUNDARY.map((pt) => ({
    ...pt,
    lat: Number((pt.lat + dLat).toFixed(6)),
    lng: Number((pt.lng + dLng).toFixed(6)),
  }));
}

