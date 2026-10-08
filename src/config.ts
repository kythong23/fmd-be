import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Thiếu biến môi trường ${name} (xem .env.example)`);
  return v;
}

/** cloudinary://<api_key>:<api_secret>@<cloud_name> — copy nguyên từ Cloudinary Dashboard. */
function parseCloudinaryUrl(raw: string) {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    u = new URL('invalid:');
  }
  if (u.protocol !== 'cloudinary:' || !u.username || !u.password || !u.hostname) {
    throw new Error('CLOUDINARY_URL sai định dạng, cần cloudinary://<api_key>:<api_secret>@<cloud_name>');
  }
  return {
    cloudName: u.hostname,
    apiKey: decodeURIComponent(u.username),
    apiSecret: decodeURIComponent(u.password),
  };
}

export const config = {
  databaseUrl: required('DATABASE_URL'),
  port: Number(process.env.PORT ?? 2304),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  refreshExpiresIn: process.env.REFRESH_EXPIRES_IN ?? '30d',
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? 'http://localhost:5173',
  publicApiUrl: process.env.PUBLIC_API_URL ?? 'http://localhost:2304',
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  // Có CLOUDINARY_URL thì ảnh lên Cloudinary, không có thì ghi disk local (chỉ cho dev).
  cloudinary: process.env.CLOUDINARY_URL ? parseCloudinaryUrl(process.env.CLOUDINARY_URL) : null,
  cloudinaryFolder: process.env.CLOUDINARY_FOLDER ?? 'fdm',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  // Số proxy đứng trước app (Nginx = 1). 0 = không tin X-Forwarded-For (chạy trực tiếp).
  trustProxy: Number(process.env.TRUST_PROXY ?? 0),
  // Tự ping khi không có request trong N phút (Render free ngủ sau 15'). 0 = tắt.
  // URL mặc định lấy RENDER_EXTERNAL_URL mà Render tự cấp cho web service.
  keepAlive: {
    idleMinutes: Number(process.env.KEEP_ALIVE_IDLE_MINUTES ?? 0),
    url:
      process.env.KEEP_ALIVE_URL ||
      (process.env.RENDER_EXTERNAL_URL ? `${process.env.RENDER_EXTERNAL_URL}/health` : ''),
  },
  isProd: process.env.NODE_ENV === 'production',
  logRetentionDays: Number(process.env.LOG_RETENTION_DAYS ?? 14),
  logGetBody: process.env.LOG_GET_BODY === 'true',
  enableLogUi: process.env.ENABLE_LOG_UI !== 'false',
  enableDocs: process.env.ENABLE_DOCS ? process.env.ENABLE_DOCS === 'true' : process.env.NODE_ENV !== 'production',
};
