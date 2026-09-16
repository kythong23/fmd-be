# INSTRUCTION — Quản lý tình trạng cây sầu riêng qua mã QR

Bộ tài liệu chuẩn của dự án. Hợp nhất từ `claude instruction/` (chi tiết thi công) và `chatgpt instruction/` (khung + luật chung). Hai thư mục cũ đã được thay thế bởi thư mục này.

## Thứ tự đọc

| File | Nội dung | Đọc khi |
|---|---|---|
| `08_AI_RULES.md` | Luật làm việc của AI agent, source of truth, Definition of Done | **Luôn đọc đầu tiên** |
| `09_DECISIONS.md` | Các quyết định đã chốt (auth, URL QR, FE mới, DB, tọa độ) | **Luôn đọc thứ hai** |
| `01_REQUIREMENTS.md` | Mục tiêu, vai trò, phạm vi MVP, backlog | Bắt đầu dự án / tranh luận scope |
| `02_ARCHITECTURE.md` | Kiến trúc logic, module, luồng QR, bản đồ | Trước khi đụng cấu trúc hệ thống |
| `03_DATABASE.md` | Schema 5 bảng, DDL, index, seed, RLS | Làm DB / migration |
| `04_API.md` | Endpoint MVP, đặc tả `POST /trees/:code/history`, HTTP semantics | Làm BE hoặc nối FE↔BE |
| `05_FRONTEND.md` | Stack, cấu trúc thư mục, design tokens, routing, từng màn hình MVP | Làm FE |
| `06_BACKEND.md` | Stack, layering, phân quyền, bảo mật, thứ tự triển khai | Làm BE |
| `07_DESIGN_SYSTEM.md` | UX priorities, token, component, accessibility, DoD cho UI | Làm UI |
| `ref/prototype-audit.md` | Audit prototype `durian-tree/` | **Chỉ tham chiếu nghiệp vụ & UI** — không phải code base |

## Quy tắc về tài liệu

1. **Quyết định chỉ ghi ở `09_DECISIONS.md`.** File khác trỏ về, không phát biểu lại.
2. Đổi schema → sửa `03_DATABASE.md` + migration. Đổi endpoint → sửa `04_API.md` + FE consumer. Không để tài liệu lệch code.
3. `ref/` là tham chiếu lịch sử, **không** là lệnh thi công.
4. Mâu thuẫn giữa 2 file: không tự chọn ngầm — nêu ra và chốt vào `09_DECISIONS.md` (`08_AI_RULES.md` §2).

## Trạng thái hiện tại

- `durian-tree/` — prototype React 19 + Vite 6 + Tailwind v4, ~6.900 dòng, chạy được bằng mock. **Tham chiếu UI.**
- `fdm-be/` — repo rỗng. Backend chưa bắt đầu.
- FE production: **chưa bắt đầu** (build mới theo `05_FRONTEND.md`).
