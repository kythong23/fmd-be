import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { config } from '../config.js';
import { badRequest, forbidden } from '../errors.js';

export const uploadsRouter = Router();

// 06_BACKEND §5: chỉ ảnh, <= 10 MB, rate limit chống đầy storage.
const MAX_BYTES = 10 * 1024 * 1024;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 5 } });
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Tải ảnh quá nhanh. Đợi một phút rồi thử lại.' } },
});

/** Kiểm tra magic bytes, KHÔNG tin Content-Type client gửi. */
function sniffImage(buf: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

/**
 * ponytail: lưu ảnh xuống đĩa local, đủ cho MVP 1 vườn.
 * Đổi sang S3/Supabase Storage = thay thân hàm này, route và FE không đổi (06_BACKEND §11).
 */
async function store(buf: Buffer, ext: string): Promise<string> {
  const name = `${randomUUID()}.${ext}`;
  await writeFile(join(config.uploadDir, name), buf);
  return new URL(`/uploads/${name}`, config.publicApiUrl).toString();
}

uploadsRouter.post('/', uploadLimiter, upload.array('files', 5), async (req, res, next) => {
  try {
    if (req.user!.role === 'viewer') throw forbidden('Tài khoản chỉ có quyền xem');
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (!files.length) throw badRequest('NO_FILE', 'Không có tệp nào được gửi lên');

    const urls: string[] = [];
    for (const file of files) {
      const ext = sniffImage(file.buffer);
      if (!ext) throw badRequest('UNSUPPORTED_FILE', 'Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP');
      urls.push(await store(file.buffer, ext));
    }
    res.status(201).json({ urls });
  } catch (err) {
    next(err);
  }
});
