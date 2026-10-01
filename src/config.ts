import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Thiếu biến môi trường ${name} (xem .env.example)`);
  return v;
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
  // D12: đủ 5 biến R2_* thì ảnh lên Cloudflare R2, thiếu thì ghi disk local (chỉ cho dev).
  r2: process.env.R2_BUCKET
    ? {
        accountId: required('R2_ACCOUNT_ID'),
        accessKeyId: required('R2_ACCESS_KEY_ID'),
        secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
        bucket: process.env.R2_BUCKET,
        publicUrl: required('R2_PUBLIC_URL'),
      }
    : null,
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
