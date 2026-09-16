/**
 * Tài liệu OpenAPI 3.0 sinh TỪ chính zod schema đang dùng để validate (04_API.md §6:
 * "API docs phải cập nhật cùng code"). Không có file YAML viết tay nào để lệch.
 *
 * Thêm endpoint mới => thêm một `route()` ở dưới; request/response lấy thẳng schema có sẵn.
 */
import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { config } from './config.js';
import * as s from './schemas.js';

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

const Tree = registry.register('DurianTree', s.treeSchema);
const HistoryRecord = registry.register('HistoryRecord', s.historyRecordSchema);
const ActivityItem = registry.register('ActivityItem', s.activityItemSchema);
const Farm = registry.register('Farm', s.farmSchema);
const FarmStats = registry.register('FarmStats', s.farmStatsSchema);
const AuthUser = registry.register('AuthUser', s.authUserSchema);
const AuthTokens = registry.register('AuthTokens', s.authTokensSchema);
const ApiError = registry.register('ApiError', s.apiErrorSchema);
const QrItem = registry.register('QrItem', s.qrItemSchema);

const json = (schema: z.ZodTypeAny, description: string) => ({
  description,
  content: { 'application/json': { schema } },
});

const err = (description: string) => json(ApiError, description);

/** Lỗi lặp ở mọi route sau middleware auth — khai báo một lần. */
const AUTH_ERRORS = {
  401: err('Chưa đăng nhập hoặc token hết hạn'),
  403: err('Không đủ quyền'),
  422: err('Dữ liệu không hợp lệ'),
};

const codeParam = z.object({
  code: z.string().openapi({ param: { name: 'code', in: 'path' }, example: 'SD-001' }),
});

function route(cfg: RouteConfig) {
  registry.registerPath({ security: [{ bearerAuth: [] }], ...cfg });
}

// ── Auth ─────────────────────────────────────────────────────────────────────
route({
  method: 'post',
  path: '/auth/login',
  tags: ['Auth'],
  summary: 'Đăng nhập (rate limit 10 lần / 15 phút)',
  security: [],
  request: { body: { content: { 'application/json': { schema: s.loginSchema } } } },
  responses: { 200: json(AuthTokens, 'Đăng nhập thành công'), 401: err('Email hoặc mật khẩu không đúng') },
});

route({
  method: 'post',
  path: '/auth/refresh',
  tags: ['Auth'],
  summary: 'Làm mới access token',
  security: [],
  request: { body: { content: { 'application/json': { schema: s.refreshSchema } } } },
  responses: { 200: json(AuthTokens, 'Token mới'), 401: err('Refresh token không hợp lệ') },
});

route({
  method: 'get',
  path: '/auth/me',
  tags: ['Auth'],
  summary: 'Thông tin tài khoản hiện tại (role + assignedBlock)',
  responses: { 200: json(AuthUser, 'Tài khoản hiện tại'), 401: AUTH_ERRORS[401] },
});

route({
  method: 'post',
  path: '/auth/logout',
  tags: ['Auth'],
  summary: 'Thu hồi toàn bộ phiên của tài khoản',
  responses: { 204: { description: 'Đã đăng xuất' }, 401: AUTH_ERRORS[401] },
});

// ── Trees ────────────────────────────────────────────────────────────────────
route({
  method: 'get',
  path: '/trees',
  tags: ['Trees'],
  summary: 'Danh sách cây trong vườn (KHÔNG kèm history)',
  request: { query: s.treeListQuerySchema },
  responses: { 200: json(s.paginated(Tree), 'Danh sách cây'), ...AUTH_ERRORS },
});

route({
  method: 'get',
  path: '/trees/{code}',
  tags: ['Trees'],
  summary: 'Chi tiết một cây, kèm history + gallery (luồng quét QR)',
  request: { params: codeParam },
  responses: { 200: json(Tree, 'Chi tiết cây'), ...AUTH_ERRORS, 404: err('Không tìm thấy cây') },
});

route({
  method: 'post',
  path: '/trees',
  tags: ['Trees'],
  summary: 'Tạo cây mới — BE tự sinh `code`, client không gửi lên',
  description: 'Chỉ `manager`.',
  request: { body: { content: { 'application/json': { schema: s.createTreeSchema } } } },
  responses: { 201: json(Tree, 'Cây vừa tạo'), ...AUTH_ERRORS },
});

route({
  method: 'patch',
  path: '/trees/{code}',
  tags: ['Trees'],
  summary: 'Sửa hồ sơ cây',
  description: '`manager`, hoặc `worker` với cây thuộc `assignedBlock`. `healthScore` không sửa được ở đây.',
  request: { params: codeParam, body: { content: { 'application/json': { schema: s.updateTreeSchema } } } },
  responses: { 200: json(Tree, 'Cây sau khi sửa'), ...AUTH_ERRORS, 404: err('Không tìm thấy cây') },
});

route({
  method: 'patch',
  path: '/trees/{code}/position',
  tags: ['Trees'],
  summary: 'Đổi vị trí cây (giai đoạn 2 — kéo-thả bản đồ)',
  description: 'Chỉ `manager`. lat/lng là nguồn sự thật, mapPosition chỉ là cache hiển thị (D5).',
  request: { params: codeParam, body: { content: { 'application/json': { schema: s.updatePositionSchema } } } },
  responses: { 200: json(Tree, 'Cây sau khi đổi vị trí'), ...AUTH_ERRORS, 404: err('Không tìm thấy cây') },
});

route({
  method: 'delete',
  path: '/trees/{code}',
  tags: ['Trees'],
  summary: 'Xoá cây (chỉ `manager`)',
  request: { params: codeParam },
  responses: { 204: { description: 'Đã xoá' }, ...AUTH_ERRORS, 404: err('Không tìm thấy cây') },
});

// ── Lịch sử / cập nhật tình trạng ────────────────────────────────────────────
route({
  method: 'post',
  path: '/trees/{code}/history',
  tags: ['History'],
  summary: 'Ghi nhận cập nhật tình trạng cây',
  description: [
    'Endpoint quan trọng nhất (04_API.md §2). Trong MỘT transaction, BE sẽ:',
    '1. Validate payload; `healthScore`, `activity`, `type` client gửi lên đều bị bỏ qua.',
    '2. Sinh `activity` + `type` từ `actionTaken`.',
    '3. Tính lại `healthScore` từ `status`.',
    '4. INSERT `tree_history` (append-only) và UPDATE `trees`.',
    '',
    'Chống ghi trùng: gửi lại cùng `clientRequestId` trả **200** kèm bản ghi cũ, không tạo bản mới.',
    'Tạo mới thành công trả **201**.',
    '',
    'Quyền: `manager`, hoặc `worker` với cây thuộc `assignedBlock`.',
  ].join('\n'),
  request: { params: codeParam, body: { content: { 'application/json': { schema: s.createHistorySchema } } } },
  responses: {
    201: json(s.historyMutationResultSchema, 'Đã tạo bản ghi mới, kèm cây đã cập nhật'),
    200: json(s.historyMutationResultSchema, 'clientRequestId đã tồn tại — trả lại bản ghi cũ'),
    ...AUTH_ERRORS,
    404: err('Không tìm thấy cây'),
  },
});

route({
  method: 'get',
  path: '/trees/{code}/history',
  tags: ['History'],
  summary: 'Timeline của một cây',
  request: { params: codeParam, query: s.historyQuerySchema },
  responses: { 200: json(s.paginated(HistoryRecord), 'Lịch sử cây'), ...AUTH_ERRORS, 404: err('Không tìm thấy cây') },
});

route({
  method: 'get',
  path: '/activity',
  tags: ['History'],
  summary: 'Nhật ký hoạt động toàn vườn',
  request: { query: s.activityQuerySchema },
  responses: { 200: json(s.paginated(ActivityItem), 'Feed hoạt động'), ...AUTH_ERRORS },
});

// ── Farm ─────────────────────────────────────────────────────────────────────
route({
  method: 'get',
  path: '/farm',
  tags: ['Farm'],
  summary: 'Thông tin vườn + mốc trắc địa + mapLayers (bản vẽ thửa đất)',
  responses: { 200: json(Farm, 'Thông tin vườn'), ...AUTH_ERRORS, 404: err('Không tìm thấy vườn') },
});

route({
  method: 'get',
  path: '/farm/stats',
  tags: ['Farm'],
  summary: 'Số liệu tổng quan cho Dashboard',
  responses: { 200: json(FarmStats, 'Thống kê theo trạng thái'), ...AUTH_ERRORS },
});

route({
  method: 'patch',
  path: '/farm/benchmark',
  tags: ['Farm'],
  summary: 'Cập nhật mốc trắc địa (chỉ `manager` — mốc lệch là cả bản đồ lệch)',
  request: { body: { content: { 'application/json': { schema: s.benchmarkSchema } } } },
  responses: { 200: json(Farm, 'Vườn sau khi cập nhật'), ...AUTH_ERRORS },
});

route({
  method: 'patch',
  path: '/farm/settings',
  tags: ['Farm'],
  summary: 'Cài đặt vườn (chỉ `manager`)',
  description: '`publicViewEnabled` KHÔNG expose — D1 khoá ở `false`, MVP không có UI bật.',
  request: { body: { content: { 'application/json': { schema: s.farmSettingsSchema } } } },
  responses: { 200: json(Farm, 'Vườn sau khi cập nhật'), ...AUTH_ERRORS },
});

// ── Uploads & QR ─────────────────────────────────────────────────────────────
route({
  method: 'post',
  path: '/uploads',
  tags: ['Uploads'],
  summary: 'Upload ảnh minh chứng, trả URL bền',
  description: 'Tối đa 5 tệp, mỗi tệp ≤ 10 MB. Chỉ JPG/PNG/WEBP — kiểm tra magic bytes, không tin Content-Type.',
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            files: z.array(z.string().openapi({ type: 'string', format: 'binary' })),
          }),
        },
      },
    },
  },
  responses: { 201: json(s.uploadResultSchema, 'Danh sách URL ảnh'), ...AUTH_ERRORS, 400: err('Tệp không hợp lệ') },
});

route({
  method: 'get',
  path: '/trees/{code}/qr',
  tags: ['QR'],
  summary: 'QR của một cây',
  description: 'QR chỉ chứa URL `<PUBLIC_BASE_URL>/tree/<code>` (D2), không chứa dữ liệu nghiệp vụ.',
  request: {
    params: codeParam,
    query: z.object({
      format: z.enum(['png']).optional().openapi({ param: { name: 'format', in: 'query' } }),
    }),
  },
  responses: {
    200: {
      description: 'JSON kèm dataUrl, hoặc ảnh PNG nếu `?format=png`',
      content: {
        'application/json': { schema: QrItem },
        'image/png': { schema: z.string().openapi({ type: 'string', format: 'binary' }) },
      },
    },
    ...AUTH_ERRORS,
    404: err('Không tìm thấy cây'),
  },
});

route({
  method: 'post',
  path: '/qr/batch',
  tags: ['QR'],
  summary: 'Xuất QR hàng loạt để in tem (tối đa 300 cây)',
  description: 'Không truyền gì = toàn bộ vườn. Kiểm tra SPA fallback trước khi in tem hàng loạt (D2).',
  request: { body: { content: { 'application/json': { schema: s.qrBatchBodySchema } } } },
  responses: { 200: json(z.object({ items: z.array(QrItem) }), 'Danh sách QR'), ...AUTH_ERRORS },
});

export function buildOpenApiDocument() {
  return new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'FDM API — Quản lý tình trạng cây sầu riêng qua mã QR',
      version: '1.0.0',
      description: [
        'Mọi endpoint (trừ `/auth/login` và `/auth/refresh`) đều yêu cầu đăng nhập — không có',
        'route đọc ẩn danh, kể cả khi quét QR (09_DECISIONS D1).',
        '',
        'Bấm **Authorize** rồi dán `accessToken` lấy từ `/auth/login`.',
        '',
        'Lỗi luôn theo dạng `{ error: { code, message, details? } }` (04_API.md §4).',
      ].join('\n'),
    },
    servers: [{ url: `${config.publicApiUrl}/api/v1` }],
    tags: [
      { name: 'Auth' },
      { name: 'Trees' },
      { name: 'History' },
      { name: 'Farm' },
      { name: 'Uploads' },
      { name: 'QR' },
    ],
  });
}
