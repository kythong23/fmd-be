import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
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

if (config.cloudinary) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
}

/** SDK Cloudinary reject bằng object { message, http_code } (upload) hoặc { error: {...} } (admin API). */
function cloudinaryError(err: unknown): { message: string; status?: number } {
  const e = err as { message?: string; http_code?: number; error?: { message?: string; http_code?: number } };
  const inner = e?.error ?? e;
  return { message: inner?.message ?? String(err), status: inner?.http_code };
}

/**
 * Gọi thử Cloudinary lúc khởi động: sai key/secret/cloud name thì dừng ngay khi deploy,
 * không đợi tới lần upload đầu tiên của người dùng mới lộ lỗi 500.
 */
export async function verifyStorage(): Promise<void> {
  if (!config.cloudinary) {
    if (config.isProd) console.warn('⚠ Chưa cấu hình CLOUDINARY_URL: ảnh ghi vào disk local, sẽ mất khi redeploy.');
    return;
  }
  try {
    await cloudinary.api.ping();
  } catch (err) {
    const { message, status } = cloudinaryError(err);
    const hint =
      status === 401 ? 'sai api_key/api_secret trong CLOUDINARY_URL'
      : status === 404 ? `không tìm thấy cloud "${config.cloudinary.cloudName}"`
      : 'không kết nối được Cloudinary';
    throw new Error(`Không kết nối được Cloudinary: ${hint} (${status ?? '-'} ${message})`);
  }
  console.log(`Cloudinary sẵn sàng: cloud "${config.cloudinary.cloudName}", folder "${config.cloudinaryFolder}"`);
}

/**
 * Production lưu Cloudinary, dev không cấu hình thì ghi disk local.
 * Đổi vendor = thay thân hàm này, route và FE không đổi (06_BACKEND §11).
 */
async function store(buf: Buffer, ext: 'jpg' | 'png' | 'webp'): Promise<string> {
  const id = randomUUID();
  if (config.cloudinary) {
    const now = new Date();
    const folder = `${config.cloudinaryFolder}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const res = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          // Tên là UUID, không bao giờ ghi đè → URL bền, cache vĩnh viễn được.
          { folder, public_id: id, resource_type: 'image', overwrite: false },
          (err, result) => (err || !result ? reject(err ?? new Error('Cloudinary không trả kết quả')) : resolve(result)),
        )
        .end(buf);
    });
    return res.secure_url;
  }
  const name = `${id}.${ext}`;
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
