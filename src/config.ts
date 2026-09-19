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
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  isProd: process.env.NODE_ENV === 'production',
  logRetentionDays: Number(process.env.LOG_RETENTION_DAYS ?? 14),
  logGetBody: process.env.LOG_GET_BODY === 'true',
  enableLogUi: process.env.ENABLE_LOG_UI !== 'false',
  enableDocs: process.env.ENABLE_DOCS ? process.env.ENABLE_DOCS === 'true' : process.env.NODE_ENV !== 'production',
};
