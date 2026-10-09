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
                                 │ Upload API (SDK cloudinary)
                    ┌────────────▼─────────────┐
  <img src> ──────► │ Ảnh  · Cloudinary        │  https://res.cloudinary.com/<cloud>/...
                    └──────────────────────────┘
```

| Thành phần | Deploy ở đâu | Công nghệ | Chi phí |
|---|---|---|---|
| FE | Cloudflare Workers (static assets) | React 19, Vite, Tailwind 4, React Router 7 | 0đ |
| BE | Render Web Service (free) | Node 22, Express 4, TypeScript, Zod | 0đ |
| Database | Neon (free) | PostgreSQL | 0đ |
| Lưu trữ ảnh | Cloudinary (free) | Lưu ảnh + CDN | 0đ (~25 credit/tháng, không cần thẻ) |
| CI/CD | GitHub Actions | typecheck, test, build, gọi deploy | 0đ (2.000 phút/tháng) |

---

## 1. FE (repo `FMD-FE`)

**Deploy ở đâu:** Cloudflare Workers ở dạng chỉ phục vụ file tĩnh (static assets). URL mặc định là `https://fmd.<account>.workers.dev`, có thể gắn domain riêng.

**Công nghệ:** React 19, Vite, Tailwind CSS 4, React Router 7, TanStack Query, zxing-wasm (quét QR). Cấu hình deploy nằm trong `wrangler.jsonc`.

**Tại sao dùng:**
- FE là SPA thuần: build ra HTML/JS/CSS, không cần server riêng. Cloudflare phục vụ file từ CDN toàn cầu, nhanh, **không ngủ** và không giới hạn băng thông ở gói free.
- `not_found_handling: "single-page-application"` trả `index.html` cho mọi đường dẫn. Điều này **bắt buộc** vì tem QR đã in trỏ tới `/tree/<code>`, thiếu thì bị lỗi 404.

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

**Công nghệ:** Node 22, Express 4, TypeScript, Zod (validate và sinh OpenAPI), JWT, argon2 (băm mật khẩu), multer (nhận upload), SDK `cloudinary` (ghi ảnh lên Cloudinary). Cấu hình deploy nằm trong [render.yaml](../render.yaml), CI/CD trong [.github/workflows/deploy.yml](../.github/workflows/deploy.yml).

**Tại sao dùng:**
- BE là server Node chạy liên tục và có thư viện native (`argon2`), nên không chạy được trên Cloudflare Workers nếu không viết lại. Render build Node trên Linux, không cần Docker hay VPS.
- Gói free 0đ, phù hợp giai đoạn demo và thử nghiệm.
- Gói free có 3 hạn chế, đều đã được xử lý:

  | Hạn chế | Cách xử lý |
  |---|---|
  | Ngủ sau 15 phút không có request | cron-job.org gọi `/health` mỗi 10 phút (bước 6). Dự phòng: server tự ping chính nó khi không có request thật ≥ 13 phút ([src/keepAlive.ts](../src/keepAlive.ts)) |
  | Không có ổ đĩa lâu dài | Ảnh lưu trên Cloudinary (mục 4) |
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
   | `CLOUDINARY_URL` | Lấy từ mục 4 |

   Các biến còn lại đã có sẵn trong `render.yaml`. `JWT_SECRET` do Render tự sinh.
3. Bấm **Apply** và đợi deploy xong. Mở `https://<service>.onrender.com/health`, phải thấy `{"success":true,"ok":true}`.
4. Vào **Settings → Deploy Hook** trên Render và copy URL. Trên GitHub, vào **Settings → Secrets and variables → Actions** và tạo secret `RENDER_DEPLOY_HOOK_URL` với URL đó.
5. Push lên `main` và kiểm tra tab **Actions** (GitHub) và **Events** (Render).
6. Giữ BE luôn thức bằng cron-job.org. Đăng ký https://cron-job.org, rồi **Create cronjob**:

   | Mục | Giá trị |
   |---|---|
   | URL | `https://<service>.onrender.com/health`. Đây là URL của **BE**, không phải FE (FE trên Cloudflare không ngủ) |
   | Execution schedule | **Every 10 minutes** (`*/10 * * * *`). Kiểm tra **Next executions** phải cách nhau 10 phút. Không để `14 * * * *` vì như vậy chỉ chạy 1 lần/giờ |
   | Notifications | Bật thông báo khi job lỗi. cron-job.org tự tắt job nếu lỗi nhiều lần liên tiếp |
   | Advanced → Timeout | 30 giây (mức tối đa của gói free) |

   Bấm **Test run**, phải thấy status 200. Nếu BE đang ngủ thì lần ping đầu có thể báo timeout, vì BE cần khoảng 50 giây để khởi động, nhưng vẫn đánh thức được BE. Các lần sau sẽ OK.
7. Sau một đêm không có ai dùng, kiểm tra **Logs** trên Render: instance ID (vd `[jn4qw]`) phải giữ nguyên, và không có dòng `==> Running 'node dist/db/migrate.js ...'` mới. Mục **History** trên cron-job.org phải toàn 200.
8. Mở trang `/logs` và xem cột IP. Nếu mọi request đều cùng một IP nội bộ (10.x…), đổi `TRUST_PROXY` thành `2`.

> Workspace free chỉ có **750 giờ/tháng**. Một service chạy 24/7 dùng khoảng 744 giờ, nên **không tạo thêm service free nào khác** trong cùng workspace.

---

## 3. Database

**Deploy ở đâu:** Neon, gói free, region AWS Singapore (`ap-southeast-1`).

**Công nghệ:** PostgreSQL (serverless). BE kết nối qua thư viện `pg`. Schema được quản lý bằng các file SQL trong `src/db/migrations/`.

**Tại sao dùng:**
- Postgres free của Render **bị xoá sau 30 ngày**. Neon free dùng lâu dài.
- Region Singapore đặt cạnh Render Singapore nên độ trễ giữa BE và DB thấp.
- DB tự tạm dừng khi không có truy vấn, nên không tốn tài nguyên. Truy vấn đầu tiên sau khi tạm dừng chậm hơn khoảng 0,5–1 giây. Cả cron-job.org lẫn server tự ping đều chỉ gọi `/health`, endpoint này không truy vấn DB, nên DB vẫn được nghỉ. **Không thêm truy vấn DB vào `/health`**, nếu không Neon sẽ chạy liên tục và tốn hết giờ compute free.
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

**Deploy ở đâu:** Cloudinary, gói free. Ảnh có URL dạng `https://res.cloudinary.com/<cloud_name>/image/upload/.../fdm/YYYY/MM/<uuid>.jpg`.

**Công nghệ:** BE nhận file qua multer (tối đa 5 ảnh × 10 MB mỗi request), kiểm tra magic bytes rồi đẩy lên Cloudinary bằng SDK `cloudinary`. DB chỉ lưu URL. FE hiển thị ảnh trực tiếp từ CDN của Cloudinary, không đi qua BE.

**Tại sao dùng:**
- Render free không có ổ đĩa lâu dài: ảnh ghi lên máy sẽ mất sau mỗi lần deploy. Cloudinary lưu vĩnh viễn.
- Đăng ký **không cần thẻ thanh toán** (Cloudflare R2 bắt buộc thẻ dù dùng gói free).
- Gói free khoảng 25 credit/tháng (1 credit ≈ 1 GB lưu trữ hoặc 1 GB băng thông), dư cho quy mô app.
- Không ngủ, ảnh phục vụ qua CDN và không tốn tài nguyên của BE.
- Resize/nén ảnh qua URL (vd chèn `w_400,q_auto,f_auto` sau `/upload/`) nếu FE cần ảnh nhỏ cho danh sách.

**Các bước thực hiện:**
1. Đăng ký tại cloudinary.com (email hoặc Google).
2. Vào **Dashboard** (hoặc **Settings → API Keys**), copy **API environment variable**, dạng `CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>`. Bấm biểu tượng con mắt để hiện secret trước khi copy.
3. Render → service BE → **Environment**:

   | Biến | Giá trị |
   |---|---|
   | `CLOUDINARY_URL` | Phần sau dấu `=` ở bước 2, bắt đầu bằng `cloudinary://` |
   | `CLOUDINARY_FOLDER` | `fdm` (đã có sẵn trong `render.yaml`) |

4. Kiểm tra:
   - Render Logs lúc start phải có dòng `Cloudinary sẵn sàng: cloud "<cloud_name>", folder "fdm"`. BE gọi thử Cloudinary khi khởi động, sai key/secret thì deploy fail ngay.
   - Upload một ảnh từ app rồi mở URL ảnh. URL phải bắt đầu bằng `https://res.cloudinary.com/`. Ảnh cũng hiện trong **Media Library → fdm** trên Cloudinary.

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
| `CLOUDINARY_URL sai định dạng` khi start | Giá trị phải bắt đầu bằng `cloudinary://`, không kèm chữ `CLOUDINARY_URL=` |
| `Không kết nối được Cloudinary: ...` khi start | 401 = sai api_key/api_secret (secret bị copy dạng `*****`?), 404 = sai cloud name |
| Ảnh upload xong một lúc thì mất | Chưa đặt `CLOUDINARY_URL`, ảnh đang ghi vào đĩa tạm của Render (log start có cảnh báo `⚠ Chưa cấu hình CLOUDINARY_URL`) |
| Job `deploy` lỗi 404/401 | Secret `RENDER_DEPLOY_HOOK_URL` sai hoặc hook đã bị regenerate |
| BE vẫn ngủ | Xem **History** của job trên cron-job.org: job còn bật không, URL đúng BE chưa, lịch có phải mỗi 10 phút không. Kiểm tra log start có dòng `[keep-alive] tự ping ...` (lớp dự phòng, cần `KEEP_ALIVE_IDLE_MINUTES` > 0), và xem có service free khác dùng chung 750 giờ không |

## Khi có người dùng thật

- **BE:** nâng Render lên Starter (khoảng 7 USD/tháng, không ngủ, đặt `KEEP_ALIVE_IDLE_MINUTES=0`), hoặc chuyển sang VPS theo [deploy-vps.md](deploy-vps.md).
- **DB:** Neon Launch nếu cần giữ lịch sử khôi phục dài hơn hoặc DB lớn hơn 0,5 GB.
- **Ảnh:** theo dõi credit trong Cloudinary Dashboard. Vượt gói free thì nâng Cloudinary hoặc chuyển sang Cloudflare R2: chỉ cần thay thân hàm `store()` trong [src/routes/uploads.ts](../src/routes/uploads.ts), ảnh cũ vẫn mở được qua URL đã lưu.
- FE giữ nguyên.
