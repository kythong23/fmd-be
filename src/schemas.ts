/** MỘT schema zod dùng chung FE + BE (06_BACKEND §7). Copy file này sang FE cùng types/durian.ts. */
import { z } from 'zod';

export const treeStatus = z.enum(['healthy', 'monitoring', 'problem', 'unknown']);
export const variety = z.enum(['Ri6', 'Monthong (Dona)', 'Musang King', 'Black Thorn', 'Chuồng Bò']);
export const conditionTag = z.enum(['leaf', 'stem', 'branch', 'flower', 'fruit', 'pest', 'soil', 'other']);
export const actionTaken = z.enum(['watering', 'fertilizing', 'spraying', 'pruning', 'treatment', 'none']);
export const leafCondition = z.enum(['good', 'fair', 'poor', 'yellowing']);
export const fruitCondition = z.enum(['developing', 'blooming', 'maturing', 'harvested', 'none']);
export const benchmarkSource = z.enum(['google', 'manual', 'gps_device', 'default']);
export const historyTypeEnum = z.enum([
  'health_check', 'watering', 'fertilizing', 'spraying', 'pruning', 'treatment', 'harvest',
]);
export const userRole = z.enum(['manager', 'worker', 'viewer']);

const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải dạng YYYY-MM-DD');

export const measurementsSchema = z.object({
  height: z.number().min(0).max(100).optional(),
  trunkDiameter: z.number().min(0).max(500).optional(),
  soilMoisture: z.number().min(0).max(100).optional(),
  fruitCount: z.number().int().min(0).max(10000).optional(),
});

/** POST /trees/:code/history — 04_API.md §2. healthScore KHÔNG có ở đây: client không được gửi. */
export const createHistorySchema = z.object({
  status: treeStatus,
  conditions: z.array(conditionTag).default([]),
  description: z.string().trim().min(1, 'Mô tả không được để trống').max(2000),
  images: z.array(z.string().url()).max(10).default([]),
  measurements: measurementsSchema.optional(),
  actionTaken: actionTaken,
  notes: z.string().max(2000).optional(),
  performer: z.string().max(200).optional(),
  dosage: z.string().max(500).optional(),
  occurredAt: z.string().datetime({ offset: true }).optional(),
  clientRequestId: z.string().min(8).max(100).optional(),
});

const treeCore = {
  variety,
  plantedDate: isoDate,
  block: z.string().max(20).optional(),
  row: z.string().max(20).optional(),
  position: z.string().max(20).optional(),
  coordinates: z.object({ lat, lng }).optional(),
  mapPosition: z.object({ x: z.number(), y: z.number() }).optional(),
  bedName: z.string().max(100).optional(),
  moundNumber: z.string().max(100).optional(),
  canopyRadius: z.number().min(1).max(200).optional(),
  status: treeStatus.optional(),
  soilMoisture: z.number().min(0).max(100).optional(),
  leafCondition: leafCondition.optional(),
  flowering: z.boolean().optional(),
  floweringStage: z.string().max(200).optional(),
  fruitCondition: fruitCondition.optional(),
  fruitCount: z.number().int().min(0).optional(),
  heightMeters: z.number().min(0).max(99).optional(),
  trunkDiameterCm: z.number().min(0).max(999).optional(),
  image: z.string().url().optional(),
  notes: z.string().max(2000).optional(),
};

/** `code` không có: BE tự sinh (04_API.md §1 — không dùng trees.length + 1). */
export const createTreeSchema = z.object(treeCore);
export const updateTreeSchema = z.object(treeCore).partial();

export const provisionTreesSchema = z.object({
  estimatedTreeCount: z.number().int().min(1).max(5000),
});

export const provisionResultSchema = z.object({
  estimatedTreeCount: z.number().int(),
  created: z.number().int(),
  deleted: z.number().int(),
  kept: z.number().int(),
  total: z.number().int(),
  message: z.string(),
  codes: z.array(z.string()),
});

export const updatePositionSchema = z.object({
  coordinates: z.object({ lat, lng }),
  mapPosition: z.object({ x: z.number(), y: z.number() }).optional(),
});

export const benchmarkSchema = z.object({
  code: z.string().max(50).optional(),
  name: z.string().max(200).optional(),
  plotNumber: z.string().max(100).optional(),
  address: z.string().max(300).optional(),
  lat,
  lng,
  elevationMeters: z.number().optional(),
  datum: z.string().max(100).optional(),
  zone: z.string().max(100).optional(),
  source: benchmarkSource.optional(),
});

export const farmSettingsSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    techLead: z.string().max(200).optional(),
    offlineSyncEnabled: z.boolean().optional(),
    // Chỉ sửa con số. Muốn sinh thêm mã QR theo số mới thì gọi POST /farm/trees/provision.
    estimatedTreeCount: z.number().int().min(0).max(5000).optional(),
    // publicViewEnabled KHÔNG expose: D1 khoá ở false, MVP không có UI bật.
  })
  .refine((v) => Object.keys(v).length > 0, 'Không có trường nào để cập nhật');

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export const refreshSchema = z.object({ refreshToken: z.string().min(10) });

export const treeListQuerySchema = z.object({
  block: z.string().max(20).optional(),
  status: treeStatus.optional(),
  q: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  cursor: z.string().max(100).optional(),
});

export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().max(100).optional(),
});

export const activityQuerySchema = historyQuerySchema.extend({
  type: historyTypeEnum.optional(),
  q: z.string().max(100).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE SCHEMAS — nguồn duy nhất cho cả type (types/durian.ts derive từ đây)
// lẫn tài liệu OpenAPI (src/openapi.ts). Sửa ở đây là type + Swagger đổi theo.
// ─────────────────────────────────────────────────────────────────────────────

export const locationSchema = z.object({
  block: z.string(),
  row: z.string(),
  position: z.string(),
  coordinates: z.object({ lat, lng }).optional(),
});

export const historyRecordSchema = z.object({
  id: z.string().uuid(),
  occurredAt: z.string().datetime({ offset: true }), // D3: không tách date/time
  activity: z.string(),
  type: historyTypeEnum,
  status: treeStatus.optional(),
  description: z.string(),
  performer: z.string().optional(),
  dosage: z.string().optional(),
  images: z.array(z.string()).optional(),
  conditions: z.array(conditionTag).optional(),
  actionTaken: actionTaken.optional(),
  notes: z.string().optional(),
  measurements: measurementsSchema.optional(),
});

export const treeSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  // Cây mới provision (QR đã in, chưa ai quét) chưa có giống/ngày trồng.
  variety: variety.optional(),
  age: z.number().int(),
  plantedDate: isoDate.optional(),
  activated: z.boolean(),
  location: locationSchema,
  mapPosition: z.object({ x: z.number(), y: z.number() }).optional(),
  bedName: z.string().optional(),
  moundNumber: z.string().optional(),
  canopyRadius: z.number().optional(),
  status: treeStatus,
  healthScore: z.number().int().min(0).max(100),
  soilMoisture: z.number(),
  leafCondition,
  flowering: z.boolean(),
  floweringStage: z.string().optional(),
  fruitCondition,
  fruitCount: z.number().int().optional(),
  heightMeters: z.number().optional(),
  trunkDiameterCm: z.number().optional(),
  lastUpdated: z.string(),
  lastUpdatedBy: z.string().optional(),
  image: z.string(),
  gallery: z.array(z.string()).optional(),
  notes: z.string().optional(),
  history: z.array(historyRecordSchema).optional(), // chỉ có ở GET /trees/:code
});

export const cadastralBenchmarkSchema = z.object({
  code: z.string(),
  name: z.string().optional(),
  plotNumber: z.string().optional(),
  address: z.string().optional(),
  lat,
  lng,
  elevationMeters: z.number().optional(),
  datum: z.string().optional(),
  zone: z.string().optional(),
  updatedAt: z.string().optional(),
  source: benchmarkSource,
});

export const farmSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  techLead: z.string().optional(),
  publicViewEnabled: z.boolean(),
  offlineSyncEnabled: z.boolean(),
  benchmark: cadastralBenchmarkSchema,
  estimatedTreeCount: z.number().int(),
  updatedAt: z.string(),
});

export const farmStatsSchema = z.object({
  total: z.number().int(),
  healthy: z.number().int(),
  monitoring: z.number().int(),
  problem: z.number().int(),
  unknown: z.number().int(),
  avgHealthScore: z.number().int(),
});

export const authUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string(),
  role: userRole,
  farmId: z.string().uuid().nullable(),
  assignedBlock: z.string().nullable(),
});

export const authTokensSchema = z.object({
  user: authUserSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

/** Danh sách phân trang bằng cursor (04_API.md §5). */
export const paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ items: z.array(item), nextCursor: z.string().nullable() });

export const qrItemSchema = z.object({
  code: z.string(),
  block: z.string().nullable().optional(),
  bedName: z.string().nullable().optional(),
  moundNumber: z.string().nullable().optional(),
  url: z.string(),
  dataUrl: z.string(),
});

export const qrBatchBodySchema = z.object({
  codes: z.array(z.string().max(50)).min(1).max(300).optional(),
  block: z.string().max(20).optional(),
});

export const uploadResultSchema = z.object({ urls: z.array(z.string()) });

export const historyMutationResultSchema = z.object({
  record: historyRecordSchema,
  tree: treeSchema,
});

/** GET /activity trả history kèm mã cây (feed toàn vườn). */
export const activityItemSchema = historyRecordSchema.extend({ treeCode: z.string() });
