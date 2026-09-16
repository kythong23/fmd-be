import { Router } from 'express';
import { assertSameFarm } from '../middleware/auth.js';
import { activityQuerySchema, createHistorySchema, historyQuerySchema } from '../schemas.js';
import * as history from '../services/historyService.js';
import { findTreeRow } from '../services/treeService.js';
import { badRequest } from '../errors.js';

export const historyRouter = Router();

/** POST /trees/:code/history — 04_API.md §2. Quyền ghi kiểm tra bên trong transaction. */
historyRouter.post('/trees/:code/history', async (req, res, next) => {
  try {
    const input = createHistorySchema.parse(req.body);
    const result = await history.createHistory(req.params.code, input, req.user!);
    // Gửi trùng clientRequestId -> 200 + bản ghi cũ, không tạo mới.
    res.status(result.created ? 201 : 200).json({ record: result.record, tree: result.tree });
  } catch (err) {
    next(err);
  }
});

historyRouter.get('/trees/:code/history', async (req, res, next) => {
  try {
    const tree = await findTreeRow(req.params.code);
    assertSameFarm(req.user!, tree.farm_id);
    res.json(await history.listTreeHistory(req.params.code, historyQuerySchema.parse(req.query)));
  } catch (err) {
    next(err);
  }
});

historyRouter.get('/activity', async (req, res, next) => {
  try {
    const farmId = req.user?.farmId;
    if (!farmId) throw badRequest('NO_FARM_ASSIGNED', 'Tài khoản chưa được gán vườn');
    res.json(await history.listFarmActivity(farmId, activityQuerySchema.parse(req.query)));
  } catch (err) {
    next(err);
  }
});
