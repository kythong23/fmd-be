import { Router } from 'express';
import { badRequest } from '../errors.js';
import { requireRole } from '../middleware/auth.js';
import { createVarietySchema, updateVarietySchema, varietyQuerySchema } from '../schemas.js';
import * as varieties from '../services/varietyService.js';

export const varietiesRouter = Router();

function farmIdOf(req: { user?: { farmId: string | null } }): string {
  const farmId = req.user?.farmId;
  if (!farmId) throw badRequest('NO_FARM_ASSIGNED', 'Tài khoản chưa được gán vườn');
  return farmId;
}

/** Mọi vai trò đọc được danh mục giống; `unitPrice` chỉ có trong response của manager (D10 → D9). */
varietiesRouter.get('/', async (req, res, next) => {
  try {
    res.json(await varieties.listVarieties(farmIdOf(req), varietyQuerySchema.parse(req.query), req.user!));
  } catch (err) {
    next(err);
  }
});

varietiesRouter.post('/', requireRole('manager'), async (req, res, next) => {
  try {
    res.status(201).json(await varieties.createVariety(farmIdOf(req), createVarietySchema.parse(req.body), req.user!));
  } catch (err) {
    next(err);
  }
});

varietiesRouter.patch('/:id', requireRole('manager'), async (req, res, next) => {
  try {
    res.json(await varieties.updateVariety(req.params.id, farmIdOf(req), updateVarietySchema.parse(req.body), req.user!));
  } catch (err) {
    next(err);
  }
});

/** Soft-delete: set active=false, trả 200 kèm bản ghi (D10 → D8 — không xoá dòng). */
varietiesRouter.delete('/:id', requireRole('manager'), async (req, res, next) => {
  try {
    res.json(await varieties.deactivateVariety(req.params.id, farmIdOf(req), req.user!));
  } catch (err) {
    next(err);
  }
});
