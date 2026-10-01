import { Router } from 'express';
import { withTransaction } from '../db/pool.js';
import { badRequest } from '../errors.js';
import { assertCanWriteTree, assertSameFarm, requireRole } from '../middleware/auth.js';
import { toTree } from '../mappers.js';
import { createTreeSchema, treeListQuerySchema, updatePositionSchema, updateTreeSchema } from '../schemas.js';
import * as trees from '../services/treeService.js';

export const treesRouter = Router();

/** Vườn của user đang đăng nhập — KHÔNG lấy farmId từ client (06_BACKEND §9). */
function farmIdOf(req: { user?: { farmId: string | null } }): string {
  const farmId = req.user?.farmId;
  if (!farmId) throw badRequest('NO_FARM_ASSIGNED', 'Tài khoản chưa được gán vườn');
  return farmId;
}

treesRouter.get('/', async (req, res, next) => {
  try {
    res.json(await trees.listTrees(farmIdOf(req), treeListQuerySchema.parse(req.query)));
  } catch (err) {
    next(err);
  }
});

treesRouter.get('/:code', async (req, res, next) => {
  try {
    const row = await trees.findTreeRow(req.params.code);
    assertSameFarm(req.user!, row.farm_id);
    res.json(await trees.getTreeDetail(row));
  } catch (err) {
    next(err);
  }
});

treesRouter.post('/', requireRole('manager'), async (req, res, next) => {
  try {
    const input = createTreeSchema.parse(req.body);
    const farmId = farmIdOf(req);
    const row = await withTransaction((client) => trees.createTree(client, farmId, input, req.user!.fullName));
    res.status(201).json(toTree(row));
  } catch (err) {
    next(err);
  }
});

treesRouter.patch('/:code', async (req, res, next) => {
  try {
    const input = updateTreeSchema.parse(req.body);
    const existing = await trees.findTreeRow(req.params.code);
    assertCanWriteTree(req.user!, existing);
    const row = await withTransaction((client) => trees.updateTree(client, req.params.code, input, req.user!));
    res.json(toTree(row));
  } catch (err) {
    next(err);
  }
});

/** Giai đoạn 2 — kéo-thả bản đồ, chỉ manager (02_ARCHITECTURE §5). */
treesRouter.patch('/:code/position', requireRole('manager'), async (req, res, next) => {
  try {
    const input = updatePositionSchema.parse(req.body);
    const existing = await trees.findTreeRow(req.params.code);
    assertSameFarm(req.user!, existing.farm_id);
    res.json(toTree(await trees.updateTreePosition(req.params.code, input, req.user!.fullName)));
  } catch (err) {
    next(err);
  }
});

treesRouter.delete('/:code', requireRole('manager'), async (req, res, next) => {
  try {
    await trees.deleteTree(req.params.code, farmIdOf(req));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
