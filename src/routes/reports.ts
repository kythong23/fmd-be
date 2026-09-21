import { Router } from 'express';
import { badRequest } from '../errors.js';
import { requireRole } from '../middleware/auth.js';
import { reportQuerySchema } from '../schemas.js';
import * as reports from '../services/reportService.js';

/** D9: báo cáo chi phí chỉ `manager`. */
export const reportsRouter = Router();
reportsRouter.use(requireRole('manager'));

function farmIdOf(req: { user?: { farmId: string | null } }): string {
  const farmId = req.user?.farmId;
  if (!farmId) throw badRequest('NO_FARM_ASSIGNED', 'Tài khoản chưa được gán vườn');
  return farmId;
}

reportsRouter.get('/summary', async (req, res, next) => {
  try {
    res.json(await reports.summary(farmIdOf(req), reportQuerySchema.parse(req.query)));
  } catch (err) {
    next(err);
  }
});

/** Cùng tham số, cùng truy vấn — CSV không được là một nguồn số liệu thứ hai. */
reportsRouter.get('/summary.csv', async (req, res, next) => {
  try {
    const q = reportQuerySchema.parse(req.query);
    const csv = reports.toCsv(await reports.summary(farmIdOf(req), q));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="bao-cao-${q.from}_${q.to}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});
