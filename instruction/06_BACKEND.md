# 06 — BACKEND

> Nguồn: hợp nhất `claude instruction/huong-dan-backend.md` (§1, 6–10) + `chatgpt instruction/06_BACKEND.md` (layering, validation, audit, logging).
> Contract API: `04_API.md`. Schema: `03_DATABASE.md`. Quyết định đã chốt: `09_DECISIONS.md`.

## 1. Stack đề xuất

| Thành phần | Chọn | Lý do |
|---|---|---|
| Runtime | **Node.js + TypeScript** | Tái dùng nguyên `src/types/durian.ts` của FE làm contract — copy 1 file, hết lệch kiểu |
| Framework | **Express** hoặc **NestJS** | Express đủ cho ~10 endpoint; NestJS nếu team đã quen |
| DB | **PostgreSQL** (Supabase hoặc tự dựng) | Schema ở `03_DATABASE.md` |
| Auth | Supabase Auth, hoặc JWT tự phát hành | Tài khoản nội bộ, **không đăng ký công khai** |
| Lưu ảnh | Supabase Storage / S3 | Ảnh minh chứng + ảnh đại diện cây |

> **Không cần API Gateway, không cần microservice.** 1 service, ~10 endpoint, 5 bảng.

---

---

## 2. Layering

```text
Controller/Route
      ↓
Application/Service
      ↓
Repository/Data Access
      ↓
Database
```

Business rule **không** đặt trong controller. Module: `auth`, `users`, `farms`, `trees`, `tree-status`, `maps`, `media`, `qr`, `common`.

---

## 3. Phân quyền

| Vai trò | Được làm |
|---|---|
| `manager` | Toàn quyền: CRUD cây, sửa mốc trắc địa, sửa cài đặt vườn, quản lý người dùng |
| `worker` | Xem mọi cây; tạo history **chỉ cho cây thuộc `assigned_block`** |
| `viewer` | Chỉ xem |

Kiểm tra ở **BE**, không tin FE — hiện FE chưa có `RoleGuard` nào, nghĩa là nếu BE không chặn thì ai cũng ghi được.

---

## 4. Cấu trúc thư mục đề xuất (Express)

```
fdm-be/src/
  types/durian.ts        # COPY từ FE — contract chung
  routes/
    trees.ts             # GET /trees, GET|POST /trees/:code, POST /trees
    history.ts           # POST|GET /trees/:code/history, GET /activity
    farm.ts              # GET /farm, PATCH /farm/benchmark, PATCH /farm/settings
    uploads.ts
    auth.ts
  services/
    treeService.ts
    healthScore.ts       # công thức ở `04_API.md` §2 — 1 hàm, có test
    activityLabels.ts    # map actionTaken → activity/type
  db/                    # query + mapper snake_case ↔ camelCase
  middleware/auth.ts     # xác thực + kiểm tra role/block
  seed.ts                # nạp dữ liệu mẫu từ ref/prototype (03_DATABASE §8)
```

Không tạo `common/utils/coordinates.ts`: MVP dùng offset đơn giản, vị trí cây lưu sẵn cả lat/lng lẫn pixel — **BE không thực hiện phép quy đổi tọa độ nào** (`09_DECISIONS.md` D5). Chỉ thêm khi chuyển sang mô hình affine.

---

## 5. Bảo mật tối thiểu

- Rate limit `/auth/login` (chống brute-force) và `/uploads` (chống đầy storage).
- Validate mọi input theo union type trong `types/durian.ts` — dùng `zod` (một schema dùng chung cho cả FE lẫn BE).
- Giới hạn upload: chỉ ảnh, ≤ 10 MB, kiểm tra magic bytes chứ không tin `Content-Type`.
- JWT dài ngày (7 ngày) + refresh token — nhân công ở vườn không đăng nhập lại mỗi ngày được. Có endpoint logout/revoke.
- Password hash bằng thư viện chuẩn (`argon2`/`bcrypt`), không tự cài thuật toán.
- Không có endpoint công khai (`09_DECISIONS.md` D1) — mọi route đọc/ghi đều qua middleware auth.

---

## 6. Thứ tự triển khai (mỗi bước đều chạy được)

1. DB + seed từ mock → dữ liệu thật giống demo.
2. `GET /trees` + `GET /trees/:code` → FE bỏ `INITIAL_TREES`, app chạy bằng dữ liệu thật (chưa cần auth).
3. `POST /uploads` + `POST /trees/:code/history` → cập nhật tình trạng sống qua reload.
4. `GET /farm` + `PATCH /farm/benchmark` → bản đồ hết phụ thuộc `localStorage`/hard-code.
5. Auth + phân quyền → khoá các endpoint ghi.
6. `GET /activity`, `POST /trees` → nhật ký vườn & tạo cây qua API.

---

---

## 7. Validation

Validate ở BE: required fields, type, length, enum/union, format `code`, file type/size, tọa độ hợp lệ. Dùng **một schema `zod` dùng chung FE + BE** (`packages/contract` hoặc copy file `types/durian.ts`).

## 8. Transaction

Thao tác ghi nhiều bảng (`tree_history` INSERT + `trees` UPDATE) phải nằm trong một transaction.

## 9. Farm scope

Mọi request liên quan farm/tree kiểm tra theo thứ tự: authenticated user → role → farm membership → `assigned_block` nếu áp dụng. **Không tin `farmId` client gửi** để bỏ qua authorization.

## 10. Audit & logging

- Ghi nhận thay đổi quan trọng: ai / làm gì / trên entity nào / thời điểm.
- Log: request ID, endpoint, status, duration, domain event quan trọng.
- **Không log** password, token, dữ liệu nhạy cảm.
- Không trả stack trace / lỗi DB gốc ra client ở production; map lỗi domain thành error code thống nhất (`04_API.md` §4).

## 11. Future readiness

Không thiết kế API chỉ phục vụ một frontend (React Native dùng lại y nguyên). Không khóa domain logic vào Google Map / Cloudinary / S3 / Supabase — vendor nằm sau một adapter.

---

## 12. Checklist

- [ ] Response khớp đúng `DurianTree` / `HistoryRecord` trong contract dùng chung FE+BE.
- [ ] `GET /trees/:code` nhanh (< 200 ms), có index trên `code`.
- [ ] `healthScore` và nhãn `activity` chỉ do BE quyết định; giá trị client gửi bị bỏ qua.
- [ ] Gửi trùng `clientRequestId` 2 lần → chỉ 1 bản ghi lịch sử.
- [ ] Ảnh upload lên trả URL bền, reload vẫn còn.
- [ ] `worker` ghi cho cây ngoài `assigned_block` → **403** (test bằng tài khoản thật).
- [ ] `viewer` gọi mọi endpoint ghi → **403**.
- [ ] QR sinh ra trỏ đúng `/tree/:code` và hosting đã bật SPA fallback — **kiểm tra trước khi in tem hàng loạt** (`09_DECISIONS.md` D2).
