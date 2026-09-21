import { Router } from 'express';
import { badRequest } from '../errors.js';
import { requireRole } from '../middleware/auth.js';
import { createMaterialSchema, materialQuerySchema, updateMaterialSchema } from '../schemas.js';
import * as materials from '../services/materialService.js';

export const materialsRouter = Router();

function farmIdOf(req: { user?: { farmId: string | null } }): string {
  const farmId = req.user?.farmId;
  if (!farmId) throw badRequest('NO_FARM_ASSIGNED', 'Tài khoản chưa được gán vườn');
  return farmId;
}

/** Mọi vai trò đọc được danh mục; `unitPrice` chỉ có trong response của manager (D9). */
materialsRouter.get('/', async (req, res, next) => {
  try {
    res.json(await materials.listMaterials(farmIdOf(req), materialQuerySchema.parse(req.query), req.user!));
  } catch (err) {
    next(err);
  }
});

materialsRouter.post('/', requireRole('manager'), async (req, res, next) => {
  try {
    res.status(201).json(await materials.createMaterial(farmIdOf(req), createMaterialSchema.parse(req.body), req.user!));
  } catch (err) {
    next(err);
  }
});

materialsRouter.patch('/:id', requireRole('manager'), async (req, res, next) => {
  try {
    res.json(await materials.updateMaterial(req.params.id, farmIdOf(req), updateMaterialSchema.parse(req.body), req.user!));
  } catch (err) {
    next(err);
  }
});

/** Soft-delete: set active=false, trả 200 kèm bản ghi (D8 — không xoá dòng). */
materialsRouter.delete('/:id', requireRole('manager'), async (req, res, next) => {
  try {
    res.json(await materials.deactivateMaterial(req.params.id, farmIdOf(req), req.user!));
  } catch (err) {
    next(err);
  }
});
