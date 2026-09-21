/**
 * CONTRACT dùng chung FE + BE (04_API.md §0).
 *
 * Mọi type ở đây DERIVE từ zod schema trong `../schemas.ts` — một nguồn duy nhất cho
 * type TypeScript, validation runtime và tài liệu OpenAPI (`../openapi.ts`).
 * Sửa schema => type và Swagger đổi theo, không có chỗ nào lệch được.
 *
 * Nguồn gốc: durian-tree/src/types/durian.ts, đã sửa theo 09_DECISIONS D3:
 *  - HistoryRecord: `date` + `time` -> MỘT trường `occurredAt` (ISO).
 *  - HistoryRecord: thêm `conditions`, `actionTaken`, `notes` (FE cũ gửi lên nhưng mất).
 *  - DurianTree: `age` do BE tính từ `plantedDate`, FE không gửi lên.
 *
 * Copy sang FE cùng với `schemas.ts` — hai file đi thành một cặp.
 */
import type { z } from 'zod';
import type * as s from '../schemas.js';

export type TreeStatus = z.infer<typeof s.treeStatus>;
export type DurianVariety = z.infer<typeof s.variety>;
export type ConditionTag = z.infer<typeof s.conditionTag>;
export type ActionTaken = z.infer<typeof s.actionTaken>;
export type HistoryType = z.infer<typeof s.historyTypeEnum>;
export type LeafCondition = z.infer<typeof s.leafCondition>;
export type FruitCondition = z.infer<typeof s.fruitCondition>;
export type BenchmarkSource = z.infer<typeof s.benchmarkSource>;
export type UserRole = z.infer<typeof s.userRole>;

export type Location = z.infer<typeof s.locationSchema>;
export type Measurements = z.infer<typeof s.measurementsSchema>;
export type HistoryRecord = z.infer<typeof s.historyRecordSchema>;
export type DurianTree = z.infer<typeof s.treeSchema>;
export type CadastralBenchmark = z.infer<typeof s.cadastralBenchmarkSchema>;
export type Farm = z.infer<typeof s.farmSchema>;
export type FarmStats = z.infer<typeof s.farmStatsSchema>;
export type AuthUser = z.infer<typeof s.authUserSchema>;
export type AuthTokens = z.infer<typeof s.authTokensSchema>;
export type ApiErrorBody = z.infer<typeof s.apiErrorSchema>;
export type QrItem = z.infer<typeof s.qrItemSchema>;
export type MaterialType = z.infer<typeof s.materialType>;
export type Material = z.infer<typeof s.materialSchema>;
export type MaterialUsage = z.infer<typeof s.materialUsageSchema>;
export type TaskScope = z.infer<typeof s.taskScope>;
export type TaskStatus = z.infer<typeof s.taskStatus>;
export type Task = z.infer<typeof s.taskSchema>;
export type ReportSummary = z.infer<typeof s.reportSummarySchema>;

/** Payload POST /trees/:code/history (04_API.md §2). `input` = trước khi zod áp default. */
export type UpdateFormData = z.input<typeof s.createHistorySchema>;
export type CreateTreeInput = z.input<typeof s.createTreeSchema>;
export type UpdateTreeInput = z.input<typeof s.updateTreeSchema>;
export type CreateMaterialInput = z.input<typeof s.createMaterialSchema>;
export type CreateTaskInput = z.input<typeof s.createTaskSchema>;

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}
