import type { NextFunction, Request, Response } from 'express';
import { query } from '../db/pool.js';
import { config } from '../config.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      errorCode?: string;
      errorStack?: string;
    }
  }
}

const SECRET_KEYS = /^(password|newPassword|oldPassword|passwordHash|token|accessToken|refreshToken|authorization)$/i;
const MAX_JSON_BYTES = 32 * 1024;
const CODE_RE = /^[A-Za-z0-9_-]{2,40}$/;

/** Ẩn field nhạy cảm + cắt mảng dài, trước khi ghi xuống DB. */
export function redact(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (depth > 6) return '[deep]';
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SECRET_KEYS.test(k) ? '[redacted]' : redact(v, depth + 1);
  }
  return out;
}

function fit(value: unknown): unknown {
  if (value === undefined) return null;
  const json = JSON.stringify(value);
  if (json === undefined) return null;
  return json.length > MAX_JSON_BYTES ? { truncated: true, bytes: json.length, preview: json.slice(0, 2000) } : value;
}

/** Gom mã cây xuất hiện trong url/payload/response để trace ngược theo cây. */
function collectTreeCodes(value: unknown, out: Set<string>, depth = 0): void {
  if (value === null || typeof value !== 'object' || depth > 5) return;
  if (Array.isArray(value)) {
    for (const v of value.slice(0, 50)) collectTreeCodes(v, out, depth + 1);
    return;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (k === 'error') continue; // error.code là mã lỗi, không phải mã cây
    if ((k === 'code' || k === 'treeCode') && typeof v === 'string' && CODE_RE.test(v)) out.add(`tree:${v}`);
    else collectTreeCodes(v, out, depth + 1);
  }
}

export function subjectsOf(
  url: string,
  user: { id?: string; farmId?: string | null } | undefined,
  payload: unknown,
  response: unknown,
): string[] {
  const out = new Set<string>();
  const m = url.match(/\/trees\/([^/?#]+)/);
  if (m) out.add(`tree:${decodeURIComponent(m[1])}`);
  collectTreeCodes(payload, out);
  collectTreeCodes(response, out);
  if (user?.id) out.add(`user:${user.id}`);
  if (user?.farmId && /\/farm/.test(url)) out.add(`farm:${user.farmId}`);
  return [...out].slice(0, 30);
}

/**
 * Ghi 1 dòng api_log mỗi request. Mount SAU express.json (cần req.body đã parse).
 * GET thành công chỉ lưu metadata — response list cây rất to và không dùng để trace.
 */
export function apiLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Chỉ log API của project — bỏ request rác của trình duyệt (/.well-known/...) và chính trang /logs.
    if (!req.originalUrl.startsWith('/api/v1/') || req.originalUrl.startsWith('/api/v1/logs')) return next();
    const start = Date.now();
    const json = res.json.bind(res);
    let responseBody: unknown;
    res.json = (body: unknown) => {
      responseBody = body;
      return json(body);
    };

    res.on('finish', () => {
      const failed = res.statusCode >= 400;
      // Audit log chỉ quan tâm request LÀM THAY ĐỔI dữ liệu. GET thành công chiếm ~95% lưu lượng
      // (FE polling) mà không nói lên điều gì -> bỏ hẳn. GET lỗi vẫn giữ vì đó là lúc cần điều tra.
      if (req.method === 'GET' && !failed && !config.logGetBody) return;
      // GET thành công: chỉ lưu query string (nhẹ, đủ biết FE gọi tham số gì).
      // Response của GET quá to (list cây) -> chỉ lưu khi bật LOG_GET_BODY để debug.
      const keepBody = failed || req.method !== 'GET';
      const payload = keepBody ? redact(req.body) : Object.keys(req.query).length ? redact(req.query) : undefined;
      const response = keepBody || config.logGetBody ? redact(responseBody) : undefined;
      const err = responseBody as { error?: { code?: string } } | undefined;

      query(
        `insert into api_log(request_id, user_id, user_email, method, path, status, duration_ms, ip, subjects, payload, response, error_code, error_stack)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          req.requestId,
          req.user?.id ?? null,
          // login/refresh chưa có req.user -> lấy email trong payload để dòng log không trống.
          req.user?.email ?? (typeof req.body?.email === 'string' ? req.body.email : null),
          req.method,
          req.originalUrl,
          res.statusCode,
          Date.now() - start,
          req.ip ?? null,
          subjectsOf(req.originalUrl, req.user, req.body, responseBody),
          fit(payload),
          fit(response),
          failed ? (err?.error?.code ?? null) : null,
          res.locals.errorStack ?? null,
        ],
      ).catch((e) => console.error(`[${req.requestId}] api_log insert failed`, e));
    });

    next();
  };
}

/** ponytail: dọn log cũ bằng setInterval thay vì cron/pg_cron — 1 tiến trình, đủ dùng. */
export function startApiLogCleanup() {
  const purge = () =>
    query(`delete from api_log where ts < now() - ($1 || ' days')::interval`, [config.logRetentionDays]).catch((e) =>
      console.error('api_log cleanup failed', e),
    );
  purge();
  setInterval(purge, 24 * 60 * 60 * 1000).unref();
}
