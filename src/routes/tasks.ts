import { Router } from 'express';
import { badRequest } from '../errors.js';
import { requireRole } from '../middleware/auth.js';
import { completeTaskSchema, createTaskSchema, taskQuerySchema, updateTaskSchema } from '../schemas.js';
import * as tasks from '../services/taskService.js';

export const tasksRouter = Router();

function farmIdOf(req: { user?: { farmId: string | null } }): string {
  const farmId = req.user?.farmId;
  if (!farmId) throw badRequest('NO_FARM_ASSIGNED', 'Tài khoản chưa được gán vườn');
  return farmId;
}

/** from/to bắt buộc — không có "toàn bộ lịch sử kế hoạch" (04_API.md §1). */
tasksRouter.get('/', async (req, res, next) => {
  try {
    res.json(await tasks.listTasks(farmIdOf(req), taskQuerySchema.parse(req.query), req.user!));
  } catch (err) {
    next(err);
  }
});

tasksRouter.post('/', requireRole('manager'), async (req, res, next) => {
  try {
    res.status(201).json(await tasks.createTask(farmIdOf(req), createTaskSchema.parse(req.body), req.user!));
  } catch (err) {
    next(err);
  }
});

/** manager sửa mọi trường; worker chỉ `status` của task mình — kiểm trong service. */
tasksRouter.patch('/:id', async (req, res, next) => {
  try {
    res.json(await tasks.updateTask(req.params.id, farmIdOf(req), updateTaskSchema.parse(req.body), req.user!));
  } catch (err) {
    next(err);
  }
});

tasksRouter.delete('/:id', requireRole('manager'), async (req, res, next) => {
  try {
    await tasks.deleteTask(req.params.id, farmIdOf(req));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/** 04_API.md §2b — tạo tree_history rồi đóng task trong một transaction. */
tasksRouter.post('/:id/complete', async (req, res, next) => {
  try {
    res.json(await tasks.completeTask(req.params.id, farmIdOf(req), completeTaskSchema.parse(req.body), req.user!));
  } catch (err) {
    next(err);
  }
});
