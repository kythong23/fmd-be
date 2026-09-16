# 09 — QUYẾT ĐỊNH ĐÃ CHỐT

> **File này là nguồn duy nhất cho các quyết định dưới đây.** Mọi tài liệu khác chỉ được *trỏ về* đây, không phát biểu lại theo cách của mình.
> Thêm quyết định mới: nối vào cuối bảng, không sửa/xoá dòng cũ — ghi "thay thế bởi D-xx" nếu đảo quyết định.

| ID | Vấn đề | Quyết định | Ngày | Ảnh hưởng |
|---|---|---|---|---|
| **D1** | Xem thông tin cây có cần đăng nhập? | **Bắt buộc đăng nhập.** Không có chế độ xem công khai, kể cả khi quét QR. | 2026-09-15 | `04_API`, `06_BACKEND`, `05_FRONTEND` §5 |
| **D2** | Mã QR trỏ đường dẫn nào? | **`https://<domain>/tree/<code>`** — path thật, không dùng hash. | 2026-09-15 | `05_FRONTEND` §1 (router + SPA fallback), `04_API` |
| **D3** | Xây FE mới hay tiếp tục prototype? | **Build mới từ đầu** theo `05_FRONTEND.md`. Prototype `durian-tree/` là **tham chiếu UI & nghiệp vụ**, không phải code base. | 2026-09-15 | `05_FRONTEND`, `ref/prototype-audit.md` |
| **D4** | Database | **PostgreSQL** (Supabase hoặc tự dựng). Schema chốt ở `03_DATABASE.md`. | 2026-09-15 | `03_DATABASE`, `06_BACKEND` |
| **D5** | Nguồn sự thật của tọa độ | **lat/lng là dữ liệu gốc**; `map_x/map_y` là lớp hiển thị (cache). MVP dùng offset đơn giản, chỉ nâng lên affine khi cần chồng ảnh vệ tinh. | 2026-09-15 | `03_DATABASE`, `05_FRONTEND` §6.7, `02_ARCHITECTURE` §5 |

---

## D1 — Hệ quả bắt buộc

- Mọi endpoint nằm sau middleware auth. Không có route đọc ẩn danh.
- `farms.public_view_enabled` trong schema **giữ lại nhưng mặc định `false`** và MVP không có UI bật — để dành giai đoạn sau nếu đổi ý, không phải để dùng ngay.
- Màn hình `FarmSettings` **không** hiển thị dòng "Chế độ xem công khai: Đang bật" như prototype.
- Luồng quét QR khi chưa đăng nhập: redirect `/login?next=/tree/<code>`, đăng nhập xong quay lại đúng cây.

## D2 — Hệ quả bắt buộc

- Router dùng `createBrowserRouter` (react-router v7), **không** hash routing.
- **Hosting phải bật SPA fallback** (rewrite mọi path → `index.html`). Không có fallback = QR in ra bị 404.
- Kiểm tra fallback trên môi trường thật **trước khi in tem QR hàng loạt** — tem đã in không sửa lại được.
- QR chỉ chứa URL, không chứa dữ liệu nghiệp vụ. BE validate `code` và quyền truy cập.

## D3 — Hệ quả bắt buộc

- Không copy component từ `durian-tree/` sang. Tham chiếu để lấy: luồng nghiệp vụ, nội dung trường dữ liệu, bố cục màn hình, nhãn tiếng Việt.
- Các lỗi đã ghi trong `ref/prototype-audit.md` §6 **không được lặp lại** ở bản mới:
  - `date` + `time` tách rời → dùng **một** trường ISO/`timestamptz`.
  - Sinh mã cây bằng `trees.length + 1` → **BE sinh mã**.
  - Ảnh `URL.createObjectURL` → upload thật.
  - Logic format ngày lặp ở 4+ component → `utils/date.ts`.
  - Thiếu `@media print` cho trang in QR.
- `mockTrees.ts` + `farmMapData.ts` được dùng làm **dữ liệu seed DB** (`03_DATABASE` §8), không làm state của FE.
