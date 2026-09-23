/** snake_case (DB) <-> camelCase (API) — 04_API.md §0: chỉ map ở MỘT chỗ duy nhất. */
import { ageFromPlantedDate } from './domain/history.js';
import type { DurianTree, Farm, HistoryRecord, Material, MaterialUsage, Task, UserRole } from './types/durian.js';

const iso = (v: Date | string | null): string => (v instanceof Date ? v.toISOString() : (v ?? ''));
const num = (v: unknown): number | undefined => (v === null || v === undefined ? undefined : Number(v));

export function toTree(row: any, history?: HistoryRecord[], gallery?: string[]): DurianTree {
  return {
    id: row.id,
    code: row.code,
    variety: row.variety ?? undefined,
    age: row.planted_date ? ageFromPlantedDate(row.planted_date) : 0,
    plantedDate: row.planted_date ?? undefined,
    activated: row.activated_at !== null && row.activated_at !== undefined,
    location: {
      block: row.block ?? '',
      row: row.row_no ?? '',
      position: row.position_no ?? '',
      coordinates: row.lat !== null && row.lng !== null ? { lat: Number(row.lat), lng: Number(row.lng) } : undefined,
    },
    mapPosition: row.map_x !== null && row.map_y !== null ? { x: Number(row.map_x), y: Number(row.map_y) } : undefined,
    bedName: row.bed_name ?? undefined,
    moundNumber: row.mound_number ?? undefined,
    canopyRadius: num(row.canopy_radius),
    status: row.status,
    healthScore: Number(row.health_score ?? 0),
    soilMoisture: Number(row.soil_moisture ?? 0),
    leafCondition: row.leaf_condition ?? 'good',
    flowering: !!row.flowering,
    floweringStage: row.flowering_stage ?? undefined,
    fruitCondition: row.fruit_condition ?? 'none',
    fruitCount: num(row.fruit_count),
    heightMeters: num(row.height_meters),
    trunkDiameterCm: num(row.trunk_diameter_cm),
    lastUpdated: iso(row.last_updated),
    lastUpdatedBy: row.last_updated_by ?? undefined,
    image: row.image_url ?? '',
    gallery,
    notes: row.notes ?? undefined,
    history,
  };
}

export function toHistory(row: any): HistoryRecord {
  return {
    id: row.id,
    occurredAt: iso(row.occurred_at),
    activity: row.activity,
    type: row.type,
    status: row.status ?? undefined,
    description: row.description,
    performer: row.performer ?? undefined,
    dosage: row.dosage ?? undefined,
    images: row.images ?? [],
    conditions: row.conditions ?? [],
    actionTaken: row.action_taken ?? undefined,
    notes: row.notes ?? undefined,
    measurements: row.measurements ?? undefined,
    materials: row.materials ?? [],
  };
}

/** D9: worker/viewer không thấy giá — bỏ hẳn field, không trả 0 (0 đồng trông như dữ liệu thật). */
export function toMaterial(row: any, role: UserRole): Material {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    unit: row.unit,
    ...(role === 'manager' ? { unitPrice: num(row.unit_price) ?? null } : {}),
    active: !!row.active,
    notes: row.notes ?? undefined,
    updatedAt: iso(row.updated_at),
    createdAt: iso(row.created_at),
  };
}

export function toTask(row: any, role: UserRole): Task {
  const planned: MaterialUsage[] = row.planned_materials ?? [];
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    scope: row.scope,
    block: row.block ?? null,
    treeCode: row.tree_code ?? null,
    dueDate: row.due_date,
    status: row.status,
    assigneeId: row.assignee_id ?? null,
    assigneeName: row.assignee_name ?? null,
    plannedMaterials: role === 'manager' ? planned : planned.map(({ unitPrice, ...m }) => m),
    ...(role === 'manager' ? { estimatedCost: costOf(planned) } : {}),
    notes: row.notes ?? undefined,
    doneHistoryId: row.done_history_id ?? null,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

/** Tổng tiền luôn tính khi đọc, không lưu ở đâu (D8). */
export const costOf = (items: MaterialUsage[]): number =>
  items.reduce((sum, m) => sum + Number(m.quantity) * Number(m.unitPrice ?? 0), 0);

export function toFarm(row: any): Farm {
  return {
    id: row.id,
    name: row.name,
    techLead: row.tech_lead ?? undefined,
    publicViewEnabled: !!row.public_view_enabled,
    offlineSyncEnabled: !!row.offline_sync_enabled,
    benchmark: {
      code: row.benchmark_code ?? 'M0-TT',
      name: row.benchmark_name ?? undefined,
      plotNumber: row.plot_number ?? undefined,
      address: row.address ?? undefined,
      lat: Number(row.benchmark_lat),
      lng: Number(row.benchmark_lng),
      elevationMeters: num(row.benchmark_elevation_m),
      datum: row.benchmark_datum ?? undefined,
      zone: row.benchmark_zone ?? undefined,
      updatedAt: iso(row.benchmark_updated_at),
      source: row.benchmark_source ?? 'default',
    },
    estimatedTreeCount: Number(row.estimated_tree_count ?? 0),
    updatedAt: iso(row.updated_at),
  };
}
