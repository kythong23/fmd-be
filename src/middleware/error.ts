import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { config } from '../config.js';
import { ApiError } from '../errors.js';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint không tồn tại' } });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // apiLog đọc lại ở res.on('finish') — stack chỉ nằm trong DB, không trả ra client.
  res.locals.errorStack = err instanceof Error ? err.stack : String(err);
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'Dữ liệu không hợp lệ', details: err.flatten() },
    });
  }
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  // Lỗi từ thư viện (body-parser, multer, pg) không phải ApiError — map về message tiếng Việt
  // thay vì rơi xuống 500 "Lỗi hệ thống" kèm stack trace.
  const e = err as { type?: string; code?: string; status?: number; constraint?: string };
  if (e?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Body gửi lên không phải JSON hợp lệ' } });
  }
  if (e?.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Dữ liệu gửi lên vượt quá 1 MB' } });
  }
  if (e?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: { code: 'FILE_TOO_LARGE', message: 'Ảnh vượt quá 10 MB' } });
  }
  if (e?.code === 'LIMIT_FILE_COUNT' || e?.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: { code: 'TOO_MANY_FILES', message: 'Chỉ được gửi tối đa 5 ảnh mỗi lần' } });
  }
  if (e?.code === '23505') {
    return res.status(409).json({ error: { code: 'DUPLICATE', message: 'Dữ liệu đã tồn tại', details: e.constraint } });
  }
  if (e?.code === '23503') {
    return res.status(409).json({ error: { code: 'REFERENCE_IN_USE', message: 'Dữ liệu đang được bản ghi khác tham chiếu' } });
  }
  if (e?.code === 'ECONNREFUSED' || e?.code === '57P03' || e?.code === '3D000' || e?.code === '28P01') {
    return res.status(503).json({ error: { code: 'DB_UNAVAILABLE', message: 'Không kết nối được cơ sở dữ liệu. Thử lại sau ít phút.' } });
  }

  // 06_BACKEND §10: không trả stack trace / lỗi DB gốc ra client ở production.
  console.error(`[${req.requestId}] ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Lỗi hệ thống',
      details: config.isProd ? undefined : String(err),
    },
  });
}
