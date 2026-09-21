/** Kế hoạch công việc — 04_API.md §1 + §2b (MVP+ D7). */
import type { PoolClient } from 'pg';
import type { z } from 'zod';
import { query, withTransaction } from '../db/pool.js';
import { badRequest, conflict, forbidden, notFound } from '../errors.js';
import { toTask } from '../mappers.js';
import type { completeTaskSchema, createTaskSchema, taskQuerySchema, updateTaskSchema } from '../schemas.js';
import type { AuthUser } from '../types/durian.js';
import { insertHistory } from './historyService.js';
import { resolveMaterialUsage } from './materialService.js';

const SELECT = `select k.*, t.code as tree_code, u.full_name as assignee_name
  from tasks k
  left join trees t on t.id = k.tree_id
  left join users u on u.id = k.assignee_id`;

async function treeIdOf(farmId: string, treeCode: string): Promise<string> {
  const { rows } = await query('select id from trees where code = $1 and farm_id = $2', [treeCode, farmId]);
  if (!rows[0]) throw notFound('TREE_NOT_FOUND', `Không tìm thấy cây ${treeCode}`);
  return rows[0].id;
}

export async function listTasks(farmId: string, q: z.infer<typeof taskQuerySchema>, user: AuthUser) {
  if (q.to <= q.from) throw badRequest('INVALID_RANGE', '`to` phải sau `from`');
  const params: unknown[] = [farmId, q.from, q.to];
  const where = ['k.farm_id = $1', 'k.due_date >= $2::date', 'k.due_date < $3::date'];
  if (q.status) where.push(`k.status = $${params.push(q.status)}`);
  if (q.assigneeId) where.push(`k.assignee_id = $${params.push(q.assigneeId)}`);
  if (q.block) where.push(`k.block = $${params.push(q.block)}`);

  const { rows } = await query(`${SELECT} where ${where.join(' and ')} order by k.due_date asc, k.created_at asc`, params);
  return { items: rows.map((r) => toTask(r, user.role)) };
}

/** client bắt buộc khi đang trong transaction: pool connection khác không thấy dữ liệu chưa commit. */
async function getTaskRow(id: string, farmId: string, client?: PoolClient) {
  const sql = `${SELECT} where k.id = $1 and k.farm_id = $2`;
  const { rows } = client ? await client.query(sql, [id, farmId]) : await query(sql, [id, farmId]);
  if (!rows[0]) throw notFound('TASK_NOT_FOUND', 'Không tìm thấy công việc');
  return rows[0];
}

export async function createTask(farmId: string, input: z.infer<typeof createTaskSchema>, user: AuthUser) {
  return withTransaction(async (client) => {
    const treeId = input.treeCode ? await treeIdOf(farmId, input.treeCode) : null;
    // Vật tư dự kiến cũng snapshot: ước tính chi phí kế hoạch và prefill form lúc hoàn thành.
    const planned = await resolveMaterialUsage(client, farmId, input.plannedMaterials);
    const { rows } = await client.query(
      `insert into tasks (farm_id, title, type, scope, block, tree_id, due_date, assignee_id,
         planned_materials, notes, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id`,
      [
        farmId, input.title, input.type, input.scope, input.block ?? null, treeId, input.dueDate,
        input.assigneeId ?? null, JSON.stringify(planned), input.notes ?? null, user.id,
      ],
    );
    return toTask(await getTaskRow(rows[0].id, farmId, client), user.role);
  });
}

const FIELD_COLUMN: Record<string, string> = {
  title: 'title', type: 'type', scope: 'scope', block: 'block', dueDate: 'due_date',
  status: 'status', assigneeId: 'assignee_id', notes: 'notes',
};

export async function updateTask(id: string, farmId: string, input: z.infer<typeof updateTaskSchema>, user: AuthUser) {
  const existing = await getTaskRow(id, farmId);
  // worker chỉ đổi status của task được gán cho mình (04_API.md §1).
  if (user.role !== 'manager') {
    if (user.role === 'viewer') throw forbidden('Tài khoản chỉ có quyền xem');
    if (existing.assignee_id !== user.id) throw forbidden('Bạn chỉ được sửa công việc được giao cho mình');
    if (Object.keys(input).some((k) => k !== 'status')) throw forbidden('Bạn chỉ được đổi trạng thái công việc');
  }

  return withTransaction(async (client) => {
    const sets: string[] = [];
    const params: unknown[] = [id, farmId];
    for (const [key, col] of Object.entries(FIELD_COLUMN)) {
      const value = (input as Record<string, unknown>)[key];
      if (value !== undefined) sets.push(`${col} = $${params.push(value)}`);
    }
    if (input.treeCode !== undefined) {
      sets.push(`tree_id = $${params.push(await treeIdOf(farmId, input.treeCode))}`);
    }
    if (input.plannedMaterials !== undefined) {
      const planned = await resolveMaterialUsage(client, farmId, input.plannedMaterials);
      sets.push(`planned_materials = $${params.push(JSON.stringify(planned))}`);
    }
    sets.push('updated_at = now()');
    await client.query(`update tasks set ${sets.join(', ')} where id = $1 and farm_id = $2`, params);
    return toTask(await getTaskRow(id, farmId, client), user.role);
  });
}

/** Kế hoạch chưa làm không phải hồ sơ truy xuất nguồn gốc -> xoá thật (04_API.md §1). */
export async function deleteTask(id: string, farmId: string) {
  const { rowCount } = await query('delete from tasks where id = $1 and farm_id = $2', [id, farmId]);
  if (!rowCount) throw notFound('TASK_NOT_FOUND', 'Không tìm thấy công việc');
}

/**
 * POST /tasks/:id/complete — 04_API.md §2b: sinh tree_history rồi đóng task, MỘT transaction.
 * Quyền ghi cây do insertHistory kiểm (assertCanWriteTree), không kiểm lại ở đây.
 */
export async function completeTask(id: string, farmId: string, input: z.infer<typeof completeTaskSchema>, user: AuthUser) {
  return withTransaction(async (client) => {
    const locked = await client.query(
      `select k.*, t.code as tree_code from tasks k left join trees t on t.id = k.tree_id
       where k.id = $1 and k.farm_id = $2 for update of k`,
      [id, farmId],
    );
    const task = locked.rows[0];
    if (!task) throw notFound('TASK_NOT_FOUND', 'Không tìm thấy công việc');
    if (task.status === 'done' || task.status === 'cancelled') {
      throw conflict('TASK_NOT_OPEN', 'Công việc đã đóng');
    }
    if (user.role !== 'manager' && task.assignee_id !== user.id) {
      throw forbidden('Bạn chỉ được hoàn thành công việc được giao cho mình');
    }

    const code = input.treeCode ?? task.tree_code;
    if (!code) throw badRequest('TREE_CODE_REQUIRED', 'Task phạm vi vườn/lô phải chỉ rõ cây được ghi lịch sử');

    const { record, tree } = await insertHistory(client, code, input, user);
    await client.query(
      `update tasks set status = 'done', done_history_id = $1, updated_at = now() where id = $2`,
      [record.id, id],
    );
    return { task: toTask(await getTaskRow(id, farmId, client), user.role), tree };
  });
}
