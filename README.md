# fdm-be — Backend quản lý cây sầu riêng qua QR

Node 20 + TypeScript + Express + PostgreSQL (pg thuần, không ORM).
Tài liệu ràng buộc: [`instruction/`](instruction/) — đọc `08_AI_RULES.md` rồi `09_DECISIONS.md` trước.

## Chạy

```bash
npm install
cp .env.example .env         # sửa DATABASE_URL + JWT_SECRET
npm run migrate              # tạo 5 bảng + index
npm run seed                 # 1 vườn, 16 cây, lịch sử, 3 tài khoản (dev only)
npm run dev                  # http://localhost:2304/api/v1
```

Kiểm tra: `npm run typecheck`, `npm test`.

**Swagger UI: http://localhost:2304/api/docs** (spec thô: `/api/docs/openapi.json`).
Bấm **Authorize**, dán `accessToken` lấy từ `/auth/login` là gọi thử được mọi endpoint.
Mặc định tắt khi `NODE_ENV=production` — bật lại bằng `ENABLE_DOCS=true`.

Tài khoản seed (mật khẩu `Matkhau@123`, đổi bằng `SEED_PASSWORD`):

| Email | Vai trò | Lô phụ trách |
|---|---|---|
| manager@durian.vn | manager | toàn vườn |
| worker@durian.vn | worker | A |
| viewer@durian.vn | viewer | — |

## Chạy bằng Docker (dùng khi deploy)

Dev hằng ngày vẫn dùng `npm run dev`. Docker để đóng gói mang lên máy chủ.

```bash
cp .env.example .env        # sửa JWT_SECRET, DB_PASSWORD, CORS_ORIGIN
docker compose up -d --build   # migrate tự chạy khi container khởi động
docker compose logs -f api
```

| Việc | Lệnh |
|---|---|
| Deploy bản mới | `git pull && docker compose up -d --build` |
| Xem log | `docker compose logs -f api` |
| Vào psql | `docker compose exec db psql -U postgres fdm` |
| Backup DB | `docker compose exec -T db pg_dump -U postgres fdm > backup.sql` |
| Seed dữ liệu mẫu | `docker compose exec api node dist/seed/seed.js` |
| Dừng (giữ dữ liệu) | `docker compose down` |

⚠️ **Không dùng `docker compose down -v`** — cờ `-v` xoá volume `pgdata` và `uploads`, mất toàn bộ dữ liệu và ảnh.

Ảnh lưu ở volume `uploads`, DB ở volume `pgdata` — cả hai nằm ngoài container nên rebuild không ảnh hưởng.

## Endpoint (`/api/v1`)

Mọi route trừ `/auth/login` và `/auth/refresh` đều cần `Authorization: Bearer <accessToken>` (D1 — không có route đọc ẩn danh).

| Method | Path | Quyền |
|---|---|---|
| POST | `/auth/login` · `/auth/refresh` | công khai (rate limit 10/15p) |
| GET | `/auth/me` · POST `/auth/logout` | mọi vai trò |
| GET | `/trees` `?block=&status=&q=&limit=&cursor=` | mọi vai trò |
| GET | `/trees/:code` | mọi vai trò (kèm history + gallery) |
| POST | `/trees` | manager (BE tự sinh `code`) |
| PATCH | `/trees/:code` | manager · worker (trong `assignedBlock`) |
| PATCH | `/trees/:code/position` | manager (giai đoạn 2) |
| DELETE | `/trees/:code` | manager |
| POST | `/trees/:code/history` | manager · worker (trong `assignedBlock`) |
| GET | `/trees/:code/history` `?limit=&cursor=` | mọi vai trò |
| GET | `/activity` `?type=&q=&limit=&cursor=` | mọi vai trò |
| GET | `/farm` · `/farm/stats` | mọi vai trò |
| PATCH | `/farm/benchmark` · `/farm/settings` | manager |
| POST | `/uploads` (multipart `files`) | manager · worker |

Lỗi luôn theo `{ error: { code, message, details? } }` (04_API.md §4).

## Cấu trúc

```
src/
  schemas.ts          zod — NGUỒN DUY NHẤT: validation + type + tài liệu OpenAPI
  types/durian.ts     CONTRACT FE + BE, derive từ schemas.ts — copy cả cặp sang FE
  openapi.ts          sinh spec từ chính schema đang validate, không có YAML viết tay
  domain/history.ts   activity label, healthScore, tuổi cây — nghiệp vụ thuần, có test
  mappers.ts          snake_case ↔ camelCase, MỘT chỗ duy nhất
  services/           SQL + nghiệp vụ
  routes/             HTTP + parse input
  middleware/         auth (JWT, RBAC, farm scope), error handler
  db/migrations/      SQL, chạy bằng npm run migrate
  seed/               nạp dữ liệu prototype vào DB
```

## Khác biệt so với tài liệu — cần xác nhận

1. **`users` thêm `email`, `password_hash`, `token_version`.** `03_DATABASE.md` §6 không có cột nào để đăng nhập, nhưng `06_BACKEND.md` §5 chốt JWT tự phát hành. Ba cột này là mức tối thiểu. Nếu chuyển sang Supabase Auth thì bỏ `password_hash`/`token_version`.
2. **`HistoryRecord` bỏ `date` + `time`, dùng `occurredAt` (ISO).** Theo D3 — API không format ngược lại cho FE, FE mới tự format bằng `utils/date.ts`.
3. **`farms.benchmark_updated_at`** thêm mới để phục vụ `CadastralBenchmark.updatedAt`.
4. **Upload lưu đĩa local** (`uploads/`), không dùng S3/Supabase Storage. Đổi vendor = thay thân hàm `store()` trong [src/routes/uploads.ts](src/routes/uploads.ts).
5. **RLS chưa bật** (03_DATABASE §9) — chỉ áp dụng nếu dùng Supabase.

## Chưa làm

- Quản lý người dùng qua API (tạo/sửa user) — tạm tạo bằng seed.
- Test tích hợp cần DB thật (quyền worker/viewer, chống ghi trùng) — hiện chỉ test nghiệp vụ thuần.
