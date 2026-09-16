import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { config } from './config.js';
import { buildOpenApiDocument } from './openapi.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { farmRouter } from './routes/farm.js';
import { historyRouter } from './routes/history.js';
import { qrRouter } from './routes/qr.js';
import { treesRouter } from './routes/trees.js';
import { uploadsRouter } from './routes/uploads.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',') }));
  app.use(express.json({ limit: '1mb' }));

  // 06_BACKEND §10: request ID + log endpoint/status/duration. Không log body (chứa mật khẩu).
  app.use((req, res, next) => {
    req.requestId = (req.headers['x-request-id'] as string) || randomUUID();
    res.setHeader('x-request-id', req.requestId);
    const start = Date.now();
    res.on('finish', () => {
      console.log(`[${req.requestId}] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
  });

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/uploads', express.static(config.uploadDir, { maxAge: '30d', index: false }));

  // Swagger sinh từ zod schema. Mặc định TẮT ở production: docs không chứa dữ liệu vườn
  // nhưng vẫn phơi toàn bộ bề mặt API — bật lại bằng ENABLE_DOCS=true nếu cần ở staging.
  if (config.enableDocs) {
    const document = buildOpenApiDocument();
    app.get('/api/docs/openapi.json', (_req, res) => res.json(document));
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(document, { customSiteTitle: 'FDM API' }));
  }

  const api = express.Router();
  api.use('/auth', authRouter);
  // D1: từ đây trở xuống mọi route đều phải đăng nhập — không có route đọc ẩn danh.
  api.use(requireAuth());
  api.use('/trees', treesRouter);
  api.use('/farm', farmRouter);
  api.use('/uploads', uploadsRouter);
  api.use(historyRouter); // /trees/:code/history, /activity
  api.use(qrRouter); // /trees/:code/qr, /qr/batch
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
