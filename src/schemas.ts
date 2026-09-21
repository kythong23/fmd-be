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
export const materialType = z.enum(['fertilizer', 'pesticide', 'fungicide', 'herbicide', 'stimulant', 'other']);
export const taskScope = z.enum(['farm', 'block', 'tree']);
export const taskStatus = z.enum(['todo', 'doing', 'done', 'cancelled']);

const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải dạng YYYY-MM-DD');

export const measurementsSchema = z.object({
  height: z.number().min(0).max(100).optional(),
  trunkDiameter: z.number().min(0).max(500).optional(),
  soilMoisture: z.number().min(0).max(100).optional(),
  fruitCount: z.number().int().min(0).max(10000).optional(),
});

/**
 * 04_API.md §2a — client CHỈ gửi materialId + quantity; code/name/unit/unitPrice do BE tra
 * từ danh mục rồi snapshot (nhận giá từ client = mở cửa sửa báo cáo chi phí từ DevTools).
 */
export const materialUsageInputSchema = z.object({
  materialId: z.string().uuid(),
  quantity: z.number().positive().max(1_000_000),
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
  materials: z.array(materialUsageInputSchema).max(50).default([]),
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

/** Snapshot vật tư đã dùng lưu trong tree_history.materials (D8). */
export const materialUsageSchema = z.object({
  materialId: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unitPrice: z.number().nullable().optional(),
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
  materials: z.array(materialUsageSchema).optional(), // D8 snapshot
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

// ─────────────────────────────────────────────────────────────────────────────
// MVP+ (D7): vật tư, kế hoạch, báo cáo
// ─────────────────────────────────────────────────────────────────────────────

export const materialSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  type: materialType,
  unit: z.string(),
  // D9: chỉ manager thấy giá — serializer bỏ hẳn field với worker/viewer.
  unitPrice: z.number().nullable().optional(),
  active: z.boolean(),
  notes: z.string().optional(),
  updatedAt: z.string(),
  createdAt: z.string(),
});

export const createMaterialSchema = z.object({
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(200),
  type: materialType,
  unit: z.string().trim().min(1).max(20),
  unitPrice: z.number().min(0).max(1_000_000_000).nullable().optional(),
  notes: z.string().max(1000).optional(),
});

export const updateMaterialSchema = createMaterialSchema
  .partial()
  .extend({ active: z.boolean().optional() })
  .refine((v) => Object.keys(v).length > 0, 'Không có trường nào để cập nhật');

export const materialQuerySchema = z.object({
  type: materialType.optional(),
  q: z.string().max(100).optional(),
  // Mặc định chỉ trả vật tư đang dùng; ?active=false để xem cái đã ngừng.
  active: z
    .enum(['true', 'false', 'all'])
    .default('true')
    .transform((v) => (v === 'all' ? null : v === 'true')),
});

export const taskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  type: historyTypeEnum,
  scope: taskScope,
  block: z.string().nullable().optional(),
  treeCode: z.string().nullable().optional(),
  dueDate: isoDate,
  status: taskStatus,
  assigneeId: z.string().uuid().nullable().optional(),
  assigneeName: z.string().nullable().optional(),
  plannedMaterials: z.array(materialUsageSchema),
  estimatedCost: z.number().nullable().optional(),
  notes: z.string().optional(),
  doneHistoryId: z.string().uuid().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const taskCore = {
  title: z.string().trim().min(1).max(200),
  type: historyTypeEnum,
  scope: taskScope,
  block: z.string().max(20).optional(),
  treeCode: z.string().max(50).optional(),
  dueDate: isoDate,
  assigneeId: z.string().uuid().nullable().optional(),
  plannedMaterials: z.array(materialUsageInputSchema).max(50).default([]),
  notes: z.string().max(2000).optional(),
};

// CHECK ở DB đã chặn, nhưng báo lỗi 422 rõ ràng hơn là để Postgres ném 23514.
export const createTaskSchema = z
  .object(taskCore)
  .refine((v) => v.scope !== 'block' || !!v.block, 'scope=block phải có block')
  .refine((v) => v.scope !== 'tree' || !!v.treeCode, 'scope=tree phải có treeCode');

/** status='done' KHÔNG set qua đây — phải đi POST /tasks/:id/complete để sinh lịch sử. */
export const updateTaskSchema = z
  .object(taskCore)
  .partial()
  .extend({ status: z.enum(['todo', 'doing', 'cancelled']).optional() })
  .refine((v) => Object.keys(v).length > 0, 'Không có trường nào để cập nhật');

export const taskQuerySchema = z.object({
  from: isoDate,
  to: isoDate, // exclusive
  status: taskStatus.optional(),
  assigneeId: z.string().uuid().optional(),
  block: z.string().max(20).optional(),
});

/** POST /tasks/:id/complete — payload history + treeCode khi task không gắn cây. */
export const completeTaskSchema = createHistorySchema.extend({
  treeCode: z.string().max(50).optional(),
});

export const reportQuerySchema = z.object({
  from: isoDate,
  to: isoDate, // exclusive — 04_API §2c
  block: z.string().max(20).optional(),
  type: materialType.optional(),
});

export const reportSummarySchema = z.object({
  range: z.object({ from: isoDate, to: isoDate }),
  totalCost: z.number(),
  byMaterial: z.array(
    z.object({
      materialId: z.string(),
      code: z.string().nullable(),
      name: z.string().nullable(),
      type: materialType.nullable(),
      unit: z.string().nullable(),
      quantity: z.number(),
      cost: z.number(),
      missingPrice: z.boolean(),
    }),
  ),
  byType: z.array(z.object({ type: materialType.nullable(), cost: z.number() })),
  byBlock: z.array(z.object({ block: z.string().nullable(), cost: z.number(), activityCount: z.number() })),
  byActivity: z.array(z.object({ type: historyTypeEnum, count: z.number() })),
  // 04_API §2c: để UI nói thật "71/96 bản ghi có ghi vật tư", không để người dùng tin số thiếu là số đủ.
  coverage: z.object({ historyCount: z.number(), withMaterialsCount: z.number() }),
});

export const taskCompleteResultSchema = z.object({ task: taskSchema, tree: treeSchema });
