import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { notFound } from '../errors.js';
import { requireRole } from '../middleware/auth.js';

export const logsRouter = Router();
logsRouter.use(requireRole('manager'));

const listQuery = z.object({
  q: z.string().trim().max(200).optional(), // khớp path hoặc email
  subject: z.string().trim().max(120).optional(), // 'tree:DR-001'
  requestId: z.string().trim().max(120).optional(),
  onlyErrors: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  before: z.coerce.number().int().optional(), // id của dòng cuối trang trước
});

const COLUMNS = `id, request_id, ts, user_email, method, path, status, duration_ms, subjects, error_code`;

/** GET /logs — danh sách mới nhất, lọc theo lỗi / path / cây. */
logsRouter.get('/', async (req, res, next) => {
  try {
    const { q, subject, requestId, onlyErrors, limit, before } = listQuery.parse(req.query);
    const where: string[] = [];
    const params: unknown[] = [];
    const p = (value: unknown) => `$${params.push(value)}`;
    if (onlyErrors === 'true') where.push('status >= 400');
    if (q) {
      const like = p(`%${q}%`);
      where.push(`(path ilike ${like} or user_email ilike ${like})`);
    }
    if (subject) where.push(`subjects @> array[${p(subject)}]`);
    if (requestId) where.push(`request_id = ${p(requestId)}`);
    if (before) where.push(`id < ${p(before)}`);
    const { rows } = await query(
      `select ${COLUMNS} from api_log ${where.length ? `where ${where.join(' and ')}` : ''}
       order by id desc limit ${limit}`,
      params,
    );
    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
});

/** GET /logs/:id — full payload + response của 1 request. */
logsRouter.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await query('select * from api_log where id = $1', [Number(req.params.id)]);
    if (!rows[0]) throw notFound('LOG_NOT_FOUND', 'Không tìm thấy log');
    res.json({ log: rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /logs/:id/trace — trace ngược: mọi request khác đã chạm cùng đối tượng dữ liệu
 * (cùng mã cây / cùng user) quanh thời điểm lỗi, kèm payload & response.
 */
logsRouter.get('/:id/trace', async (req, res, next) => {
  try {
    const { rows } = await query<{ subjects: string[]; ts: string }>('select subjects, ts from api_log where id = $1', [
      Number(req.params.id),
    ]);
    const anchor = rows[0];
    if (!anchor) throw notFound('LOG_NOT_FOUND', 'Không tìm thấy log');
    // Ưu tiên mã cây; không có thì mới rơi về user (tránh kéo cả nghìn dòng của 1 user).
    const subjects = anchor.subjects.filter((s) => s.startsWith('tree:'));
    const keys = subjects.length ? subjects : anchor.subjects;
    const trace = keys.length
      ? await query(
          `select id, request_id, ts, user_email, method, path, status, duration_ms, subjects, error_code, payload, response
           from api_log where subjects && $1 and ts between $2::timestamptz - interval '2 days' and $2::timestamptz + interval '1 hour'
           order by id asc limit 200`,
          [keys, anchor.ts],
        )
      : { rows: [] };
    res.json({ subjects: keys, items: trace.rows });
  } catch (err) {
    next(err);
  }
});
