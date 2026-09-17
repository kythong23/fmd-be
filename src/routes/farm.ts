import { Router } from 'express';
import { badRequest } from '../errors.js';
import { requireRole } from '../middleware/auth.js';
import { benchmarkSchema, farmSettingsSchema, provisionTreesSchema } from '../schemas.js';
import * as farms from '../services/farmService.js';

export const farmRouter = Router();

function farmIdOf(req: { user?: { farmId: string | null } }): string {
  const farmId = req.user?.farmId;
  if (!farmId) throw badRequest('NO_FARM_ASSIGNED', 'Tài khoản chưa được gán vườn');
  return farmId;
}

farmRouter.get('/', async (req, res, next) => {
  try {
    res.json(await farms.getFarm(farmIdOf(req)));
  } catch (err) {
    next(err);
  }
});

farmRouter.get('/stats', async (req, res, next) => {
  try {
    res.json(await farms.getFarmStats(farmIdOf(req)));
  } catch (err) {
    next(err);
  }
});

farmRouter.patch('/benchmark', requireRole('manager'), async (req, res, next) => {
  try {
    res.json(await farms.updateBenchmark(farmIdOf(req), benchmarkSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});

farmRouter.patch('/settings', requireRole('manager'), async (req, res, next) => {
  try {
    res.json(await farms.updateSettings(farmIdOf(req), farmSettingsSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});

/** Khai tổng số cây ước tính -> sinh sẵn mã cây để in QR hàng loạt. */
farmRouter.post('/trees/provision', requireRole('manager'), async (req, res, next) => {
  try {
    const { estimatedTreeCount } = provisionTreesSchema.parse(req.body);
    res.status(201).json(await farms.provisionTrees(farmIdOf(req), estimatedTreeCount));
  } catch (err) {
    next(err);
  }
});
