# Kiến trúc deploy FDM

```
                    ┌──────────────────────────┐
  Người dùng ─────► │ FE  · Cloudflare Workers │  React SPA (static)
  (quét QR)         └────────────┬─────────────┘
                                 │ fetch /api/v1 (CORS)
                    ┌────────────▼─────────────┐      ┌──────────────────────┐
                    │ BE  · Render (free)      │ ───► │ Database · Neon      │
                    │ Node 22 + Express        │      │ PostgreSQL (free)    │
                    └────────────┬─────────────┘      └──────────────────────┘
                                 │ S3 API (PutObject)
                    ┌────────────▼─────────────┐
  <img src> ──────► │ Ảnh  · Cloudflare R2     │  custom domain img.<domain>
                    └──────────────────────────┘
```

| Thành phần | Deploy ở đâu | Công nghệ | Chi phí |
|---|---|---|---|
| FE | Cloudflare Workers (static assets) | React 19, Vite, Tailwind 4, React Router 7 | 0đ |
| BE | Render Web Service (free) | Node 22, Express 4, TypeScript, Zod | 0đ |
| Database | Neon (free) | PostgreSQL | 0đ |
| Lưu trữ ảnh | Cloudflare R2 | Object storage tương thích S3 | ~0đ (10 GB free) |
| CI/CD | GitHub Actions | typecheck, test, build, gọi deploy | 0đ (2.000 phút/tháng) |

---

## 1. FE (repo `FMD-FE`)

**Deploy ở đâu:** Cloudflare Workers ở dạng chỉ phục vụ file tĩnh (static assets). URL mặc định là `https://fmd.<account>.workers.dev`, có thể gắn domain riêng.

**Công nghệ:** React 19, Vite, Tailwind CSS 4, React Router 7, TanStack Query, zxing-wasm (quét QR). Cấu hình deploy nằm trong `wrangler.jsonc`.

**Tại sao dùng:**
- FE là SPA thuần: build ra HTML/JS/CSS, không cần server riêng. Cloudflare phục vụ file từ CDN toàn cầu, nhanh, **không ngủ** và không giới hạn băng thông ở gói free.
- `not_found_handling: "single-page-application"` trả `index.html` cho mọi đường dẫn. Điều này **bắt buộc** vì tem QR đã in trỏ tới `/tree/<code>`, thiếu thì bị lỗi 404.
- Cùng hệ sinh thái Cloudflare với R2 nên quản lý domain và DNS ở một chỗ.

**Các bước thực hiện:**
1. Đăng nhập Cloudflare, vào **Workers & Pages → Create → Import a repository** và chọn repo `FMD-FE`.
2. Cấu hình build:
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
3. Khai báo **biến môi trường lúc build**. Vite nhúng các biến này vào bundle, nên đổi giá trị thì phải build lại:

   | Biến | Giá trị |
   |---|---|
   | `VITE_API_URL` | `https://<service>.onrender.com/api/v1` |
   | `VITE_PUBLIC_URL` | URL của chính FE. Dùng để sinh link trong QR |

4. Deploy, rồi mở thử `https://<fe>/tree/<mã-cây>` và bấm F5. Phải thấy trang cây, không bị 404.
5. (Tuỳ chọn) Vào **Settings → Domains & Routes** để gắn domain riêng, vd `app.<domain>`.

> `VITE_PUBLIC_URL` được in vào tem QR. Hãy chốt domain chính thức **trước khi in tem hàng loạt**, vì đổi domain sau này thì các tem cũ vẫn trỏ về domain cũ.

---

## 2. BE (repo `FMD-BE`)

**Deploy ở đâu:** Render Web Service, gói free, region Singapore. URL là `https://<service>.onrender.com`.

**Công nghệ:** Node 22, Express 4, TypeScript, Zod (validate và sinh OpenAPI), JWT, argon2 (băm mật khẩu), multer (nhận upload), AWS SDK S3 (ghi ảnh lên R2). Cấu hình deploy nằm trong [render.yaml](../render.yaml), CI/CD trong [.github/workflows/deploy.yml](../.github/workflows/deploy.yml).

**Tại sao dùng:**
- BE là server Node chạy liên tục và có thư viện native (`argon2`), nên không chạy được trên Cloudflare Workers nếu không viết lại. Render build Node trên Linux, không cần Docker hay VPS.
- Gói free 0đ, phù hợp giai đoạn demo và thử nghiệm.
- Gói free có 3 hạn chế, đều đã được xử lý:

  | Hạn chế | Cách xử lý |
  |---|---|
  | Ngủ sau 15 phút không có request | Server tự ping chính nó khi im lặng ≥ 13 phút ([src/keepAlive.ts](../src/keepAlive.ts)). Có người dùng thì không ping |
  | Không có ổ đĩa lâu dài | Ảnh lưu trên R2 (mục 4) |
  | Không có bước pre-deploy | Migrate DB chạy ngay trong lệnh start, migration nào đã chạy rồi thì tự bỏ qua |

**Luồng CI/CD:**
```
push dev / PR ──► GitHub Actions: npm ci → typecheck → test → build   (không deploy)
push main     ──► như trên → qua hết ──► POST Render deploy hook &ref=<sha>
                                          └─► Render: build → migrate → start → /health
```
`render.yaml` đặt `autoDeploy: false`, nên code chưa qua CI thì không bao giờ lên production.

**Các bước thực hiện:**
1. Đăng ký Render bằng GitHub. Vào **New → Blueprint**, chọn repo `FMD-BE`, branch `main`.
2. Nhập các biến Render hỏi:

   | Biến | Giá trị |
   |---|---|
   | `DATABASE_URL` | Connection string của Neon (mục 3) |
   | `PUBLIC_BASE_URL`, `CORS_ORIGIN` | URL FE. Nhiều URL thì ngăn cách bằng dấu phẩy |
   | `PUBLIC_API_URL` | `https://<service>.onrender.com` |
   | 5 biến `R2_*` | Lấy từ mục 4 |

   Các biến còn lại đã có sẵn trong `render.yaml`. `JWT_SECRET` do Render tự sinh.
3. Bấm **Apply** và đợi deploy xong. Mở `https://<service>.onrender.com/health`, phải thấy `{"success":true,"ok":true}`.
4. Vào **Settings → Deploy Hook** trên Render và copy URL. Trên GitHub, vào **Settings → Secrets and variables → Actions** và tạo secret `RENDER_DEPLOY_HOOK_URL` với URL đó.
5. Push lên `main` và kiểm tra tab **Actions** (GitHub) và **Events** (Render).
6. Sau khoảng 30 phút không có ai dùng, mở **Logs** trên Render. Phải thấy `GET /health 200` khoảng mỗi 13 phút và không có sự kiện *spun down*.
7. Mở trang `/logs` và xem cột IP. Nếu mọi request đều cùng một IP nội bộ (10.x…), đổi `TRUST_PROXY` thành `2`.

> Workspace free chỉ có **750 giờ/tháng**. Một service chạy 24/7 dùng khoảng 744 giờ, nên **không tạo thêm service free nào khác** trong cùng workspace.

---

## 3. Database

**Deploy ở đâu:** Neon, gói free, region AWS Singapore (`ap-southeast-1`).

**Công nghệ:** PostgreSQL (serverless). BE kết nối qua thư viện `pg`. Schema được quản lý bằng các file SQL trong `src/db/migrations/`.

**Tại sao dùng:**
- Postgres free của Render **bị xoá sau 30 ngày**. Neon free dùng lâu dài.
- Region Singapore đặt cạnh Render Singapore nên độ trễ giữa BE và DB thấp.
- DB tự tạm dừng khi không có truy vấn, nên không tốn tài nguyên. Truy vấn đầu tiên sau khi tạm dừng chậm hơn khoảng 0,5–1 giây. Server tự ping `/health` không truy vấn DB, nên DB vẫn được nghỉ.
- Có sẵn branching và khôi phục dữ liệu theo thời điểm (free: lịch sử 1 ngày).

**Các bước thực hiện:**
1. Đăng ký https://neon.tech và tạo project mới, region **AWS Asia Pacific (Singapore)**.
2. Vào **Connection details** và copy connection string (có `?sslmode=require`). Đây là giá trị `DATABASE_URL` cho Render.
3. Không cần tạo bảng tay. Mỗi lần BE start sẽ tự chạy migrate.
4. Seed dữ liệu mẫu (1 lần): trên máy local, đặt `DATABASE_URL` của Neon vào `.env` rồi chạy `npm run seed`.
5. Backup định kỳ: `pg_dump "<DATABASE_URL>" > backup-$(date +%F).sql`.

> Migration nên viết theo kiểu **chỉ thêm** (thêm cột/bảng, không đổi tên hay xoá ngay). Khi đó rollback BE trên Render vẫn chạy được với schema mới.

---

## 4. Lưu trữ hình ảnh

**Deploy ở đâu:** Cloudflare R2, gắn custom domain vd `https://img.<domain>`.

**Công nghệ:** Object storage tương thích S3. BE nhận file qua multer (tối đa 5 ảnh × 10 MB mỗi request) rồi ghi lên R2 bằng `@aws-sdk/client-s3`. FE hiển thị ảnh trực tiếp từ domain của R2, không đi qua BE.

**Tại sao dùng:**
- Render free không có ổ đĩa lâu dài: ảnh ghi lên máy sẽ mất sau mỗi lần deploy. R2 lưu vĩnh viễn.
- **Băng thông tải ra (egress) miễn phí**. Với ảnh cây được xem nhiều lần, đây là khác biệt lớn so với S3.
- Gói free 10 GB lưu trữ, 1 triệu lượt ghi và 10 triệu lượt đọc mỗi tháng, dư cho quy mô app.
- Không phải server nên không ngủ, không có độ trễ khởi động.
- Ảnh được phục vụ qua CDN của Cloudflare và không tốn tài nguyên của BE.

**Các bước thực hiện:**
1. Cloudflare Dashboard → **R2 → Create bucket** (vd `fdm-images`), location **Asia-Pacific**.
2. Vào bucket → **Settings → Custom Domains → Connect Domain** và nhập `img.<domain>`. Domain phải được quản lý DNS trên Cloudflare.
   Không dùng `*.r2.dev` cho production vì bị giới hạn tốc độ và không có cache.
3. **R2 → Manage R2 API Tokens → Create API token**:
   - Quyền: **Object Read & Write**
   - Phạm vi: **chỉ bucket `fdm-images`**
4. Lấy thông tin và nhập vào Render:

   | Biến | Lấy ở đâu |
   |---|---|
   | `R2_ACCOUNT_ID` | Trang R2 Overview (Account ID) |
   | `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Hiện **một lần duy nhất** khi tạo token |
   | `R2_BUCKET` | `fdm-images` |
   | `R2_PUBLIC_URL` | `https://img.<domain>` |

   Đặt `R2_BUCKET` thì bắt buộc đủ cả 5 biến, thiếu biến nào BE sẽ báo lỗi khi start.
5. Kiểm tra: upload một ảnh từ app rồi mở URL ảnh. URL phải bắt đầu bằng `https://img.<domain>/`.

---

## Vận hành

| Việc | Làm ở đâu |
|---|---|
| Log BE | Render → service → **Logs** |
| Nhật ký API | `https://<service>.onrender.com/logs` (tài khoản quản lý) |
| Sửa biến môi trường BE | Render → **Environment**. Lưu xong Render tự restart |
| Deploy lại BE bằng tay | GitHub → **Actions → CI / Deploy BE → Run workflow**, hoặc Render → **Manual Deploy** |
| Rollback BE | Render → **Events** → chọn bản cũ → **Rollback** |
| Rollback FE | Cloudflare → Worker `fmd` → **Deployments** → chọn bản cũ → **Rollback** |
| Backup DB | `pg_dump "<DATABASE_URL>" > backup.sql` |

## Lỗi thường gặp

| Triệu chứng | Cách xử lý |
|---|---|
| FE báo lỗi CORS | `CORS_ORIGIN` trên Render phải khớp **chính xác** URL FE, kể cả `https://` và không có `/` ở cuối |
| FE vẫn gọi API cũ | Đổi `VITE_API_URL` xong phải build lại FE |
| Link QR 404 khi F5 | Kiểm tra `not_found_handling` trong `wrangler.jsonc` |
| BE build lỗi `tsc: not found` | `buildCommand` thiếu `--include=dev` (đã có sẵn trong `render.yaml`) |
| `Thiếu biến môi trường ...` | Thiếu biến trong tab Environment của Render |
| Migrate lỗi khi start | `DATABASE_URL` sai hoặc thiếu `?sslmode=require` |
| Ảnh upload xong một lúc thì mất | Chưa bật R2, ảnh đang ghi vào đĩa tạm của Render |
| Job `deploy` lỗi 404/401 | Secret `RENDER_DEPLOY_HOOK_URL` sai hoặc hook đã bị regenerate |
| BE vẫn ngủ | Logs không có dòng `[keep-alive] tự ping ...`: kiểm tra `KEEP_ALIVE_IDLE_MINUTES`, và xem có service free khác dùng chung 750 giờ không |

## Khi có người dùng thật

- **BE:** nâng Render lên Starter (khoảng 7 USD/tháng, không ngủ, đặt `KEEP_ALIVE_IDLE_MINUTES=0`), hoặc chuyển sang VPS theo [deploy-vps.md](deploy-vps.md).
- **DB:** Neon Launch nếu cần giữ lịch sử khôi phục dài hơn hoặc DB lớn hơn 0,5 GB.
- FE và R2 giữ nguyên.
