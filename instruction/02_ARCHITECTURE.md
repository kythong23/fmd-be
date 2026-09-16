# 02 — ARCHITECTURE

> Quyết định ràng buộc: `09_DECISIONS.md`.

## 1. Nguyên tắc
- Web-first, mobile-first.
- FE và BE giao tiếp qua API contract rõ ràng.
- Backend module hóa.
- Database thiết kế multi-farm từ đầu.
- Core domain không phụ thuộc vendor.
- Có thể dùng lại API cho React Native sau này.

## 2. Kiến trúc logic
```text
Client
├── Web App
│   ├── Desktop
│   └── Mobile/PWA-ready
│
└── Future React Native App
          │
          ▼
      REST API
          │
    ┌─────┴─────┐
    │ Backend   │
    │ Modules   │
    ├───────────┤
    │ Auth      │
    │ Farm      │
    │ Tree      │
    │ Status    │
    │ Map       │
    │ Media     │
    │ QR        │
    │ User/RBAC │
    └─────┬─────┘
          │
     PostgreSQL
          │
   Cloud Object Storage
```

## 3. Domain modules
- Auth & User
- Farm
- Tree
- Tree Status Log
- Map
- Media
- QR
- Authorization

Không để business logic quan trọng nằm trực tiếp trong UI.

## 4. QR
QR chứa URL: `https://<domain>/tree/<tree-code>` (`09_DECISIONS.md` D2 — path thật, không hash; hosting bắt buộc có SPA fallback).

Không dùng thông tin nhạy cảm trong QR. Backend phải kiểm tra tree-code hợp lệ và quyền truy cập.

## 5. Bản đồ 2D
MVP:
- ảnh nền cố định
- marker cây
- click marker để xem nhanh
- không kéo-thả

Giai đoạn 2:
- lưu lat/lng thật
- ảnh nền được neo bằng 2–4 điểm mốc
- FE quy đổi lat/lng ↔ pixel
- chỉ Quản lý được kéo-thả
- sau khi kéo-thả, quy đổi ngược và lưu lat/lng

## 6. Offline
Không đưa offline vào MVP nếu chưa cần thiết. Kiến trúc API/data phải không cản trở việc thêm PWA offline ở giai đoạn 2.

## 7. Quy tắc mở rộng
Mọi entity thuộc phạm vi vườn phải có `farm_id` hoặc quan hệ rõ ràng về Farm.
Không thiết kế dữ liệu chỉ phục vụ một vườn duy nhất.

## 8. Luồng QR
```text
Scan QR
  → /tree/:code
  → chưa đăng nhập → /login?next=/tree/:code
  → xác thực
  → kiểm tra quyền
  → lấy tree
  → lấy current status + recent logs
  → render read-only/update actions
```
