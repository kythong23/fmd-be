import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { notFound } from '../errors.js';
import { requireRole } from '../middleware/auth.js';

export const logsRouter = Router();
logsRouter.use(requireRole('manager'));

// Thời lượng: ">300", "<=50", "100-500" (ms).
const DURATION_RE = /^(?:(>=|<=|>|<)\s*(\d+)|(\d+)\s*-\s*(\d+))$/;

const listQuery = z.object({
  q: z.string().trim().max(200).optional(), // khớp path hoặc email
  subject: z.string().trim().max(120).optional(), // 'tree:DR-001'
  requestId: z.string().trim().max(120).optional(),
  onlyErrors: z.enum(['true', 'false']).optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  status: z.enum(['2xx', '3xx', '4xx', '5xx', 'error']).optional(),
  code: z.coerce.number().int().min(100).max(599).optional(),
  since: z.coerce.number().int().min(1).max(60 * 24 * 90).optional(), // phút gần đây
  duration: z.string().trim().regex(DURATION_RE).optional(),
  sort: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
  before: z.coerce.number().int().optional(), // id của dòng cuối trang trước
});

const COLUMNS = `id, request_id, ts, user_email, method, path, status, duration_ms, ip, subjects, error_code`;

/** GET /logs — danh sách + tổng số dòng khớp lọc (để phân trang) và tổng toàn bộ log. */
logsRouter.get('/', async (req, res, next) => {
  try {
    const f = listQuery.parse(req.query);
    const where: string[] = [];
    const params: unknown[] = [];
    const p = (value: unknown) => `$${params.push(value)}`;
    if (f.onlyErrors === 'true' || f.status === 'error') where.push('status >= 400');
    else if (f.status) {
      const base = Number(f.status[0]) * 100;
      where.push(`status between ${base} and ${base + 99}`);
    }
    if (f.code) where.push(`status = ${p(f.code)}`);
    if (f.method) where.push(`method = ${p(f.method)}`);
    if (f.q) {
      const like = p(`%${f.q}%`);
      where.push(`(path ilike ${like} or user_email ilike ${like})`);
    }
    if (f.subject) where.push(`subjects @> array[${p(f.subject)}]`);
    if (f.requestId) where.push(`request_id = ${p(f.requestId)}`);
    if (f.since) where.push(`ts >= now() - make_interval(mins => ${p(f.since)})`);
    if (f.duration) {
      const [, op, n, lo, hi] = f.duration.match(DURATION_RE)!;
      where.push(op ? `duration_ms ${op} ${p(Number(n))}` : `duration_ms between ${p(Number(lo))} and ${p(Number(hi))}`);
    }
    if (f.before) where.push(`id < ${p(f.before)}`);
    const cond = where.length ? `where ${where.join(' and ')}` : '';
    const [list, count, all] = await Promise.all([
      query(`select ${COLUMNS} from api_log ${cond} order by id ${f.sort} limit ${f.limit} offset ${f.offset}`, params),
      query<{ n: string }>(`select count(*) as n from api_log ${cond}`, params),
      query<{ n: string }>('select count(*) as n from api_log'),
    ]);
    res.json({ items: list.rows, total: Number(count.rows[0].n), all: Number(all.rows[0].n) });
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
