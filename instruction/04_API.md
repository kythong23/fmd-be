# 04 — API CONTRACT

> Nguồn: hợp nhất `claude instruction/huong-dan-backend.md` (§3–4) + `chatgpt instruction/04_API.md` (§8–11).
> Quyết định ràng buộc: xem `09_DECISIONS.md`. **Mọi endpoint đều yêu cầu đăng nhập** — không có endpoint công khai.

## 0. Nguyên tắc

- REST + JSON, prefix `/api/v1`.
- Contract ổn định giữa FE và BE; không expose thẳng schema DB.
- **Validation và authorization bắt buộc ở backend.** Không tin dữ liệu quyền do FE gửi.
- Response dùng **camelCase**, khớp `types/durian.ts` của FE. Map `snake_case` (DB) ↔ `camelCase` (API) ở **một chỗ duy nhất** trong BE.
- API docs cập nhật cùng code.

---

## 1. Danh sách API (MVP) — truy vết theo màn hình

> Mọi endpoint dưới đây có prefix `/api/v1`. Cột "Màn hình dùng" trỏ tới màn hình MVP trong `05_FRONTEND.md` §6 (tên component trong ngoặc là của prototype `durian-tree/`, chỉ để tham chiếu nghiệp vụ).

### Trees

| Method | Endpoint | Màn hình dùng | Ghi chú |
|---|---|---|---|
| GET | `/trees` | `Dashboard`, `TreeList`, `QRManagement`, `FarmMap` | Trả mảng cây **không kèm `history`** (nhẹ). Query: `?block=A&status=healthy&q=SD-001` |
| GET | `/trees/:code` | `TreePassport`, `TreeHistory`, luồng quét QR | Trả 1 cây **kèm `history` + `gallery`** |
| POST | `/trees` | `QRManagement` (modal tạo cây) | BE **tự sinh `code`** (không dùng `trees.length + 1` như FE hiện tại — xoá cây là trùng mã) |
| PATCH | `/trees/:code` | `/trees` (sửa cây) | |
| PATCH | `/trees/:code/position` | Giai đoạn 2 (kéo-thả bản đồ) | Chỉ `manager` |

### Lịch sử / cập nhật tình trạng

| Method | Endpoint | Màn hình dùng | Ghi chú |
|---|---|---|---|
| POST | `/trees/:code/history` | `UpdateTreeModal` | **Endpoint quan trọng nhất** — xem mục 4 |
| GET | `/trees/:code/history` | `TreeHistory` | Phân trang `?limit=20&cursor=` |
| GET | `/activity` | `FarmActivity` | Feed toàn vườn, `?type=watering&q=...`, sort `occurred_at DESC` |

### Farm / bản đồ

| Method | Endpoint | Màn hình dùng | Ghi chú |
|---|---|---|---|
| GET | `/farm` | `FarmMap`, `Dashboard`, `FarmSettings` | Trả thông tin vườn + `benchmark` + `mapLayers` (thay cho `farmMapData.ts` hard-code) |
| PATCH | `/farm/benchmark` | `CadastralBenchmarkModal` | Thay `localStorage['durian_cadastral_benchmark']`. Chỉ `manager` |
| PATCH | `/farm/settings` | `FarmSettings` | Tên vườn, kỹ thuật viên, công tắc public view / offline sync. Chỉ `manager` |

### Uploads & Auth

| Method | Endpoint | Màn hình dùng | Ghi chú |
|---|---|---|---|
| POST | `/uploads` (hoặc `/uploads/presign`) | `UpdateTreeModal` | Upload ảnh thật, trả URL bền (prototype dùng `URL.createObjectURL` → mất khi reload) |
| POST | `/auth/login` | `/login` | Rate limit bắt buộc |
| GET | `/auth/me` | | Trả `role` + `assignedBlock` |
| POST | `/auth/logout` | | |

---

## 2. `POST /trees/:code/history` — đặc tả chi tiết

Đây là nơi mọi nghiệp vụ nằm. Payload khớp `UpdateFormData` mà `UpdateTreeModal` đang gửi:

```jsonc
{
  "status": "healthy",                       // TreeStatus
  "conditions": ["leaf", "fruit"],           // ConditionTag[]
  "description": "Đọt già đều, không phát hiện rầy...",
  "images": ["https://.../a.jpg"],           // URL đã upload, KHÔNG phải blob:
  "measurements": { "height": 4.8, "trunkDiameter": 28, "soilMoisture": 68, "fruitCount": 42 },
  "actionTaken": "watering",                 // ActionTaken
  "notes": "",
  "performer": "Nguyễn Văn An (KTV)",
  "clientRequestId": "uuid-sinh-o-fe"        // chống ghi trùng
}
```

BE phải làm, trong **một transaction**:

1. **Validate**: `status`/`actionTaken`/`conditions` thuộc đúng union; `soilMoisture` 0–100; `height`, `trunkDiameter`, `fruitCount` ≥ 0; `description` không rỗng. (FE cũng validate bằng cùng schema `zod`, nhưng BE là nơi enforce.)
2. **Sinh `activity`** từ `actionTaken` — bảng nhãn đang hard-code ở `App.tsx:96-103`, **chuyển hẳn sang BE**:
   `watering` → "Tưới nước bổ sung", `fertilizing` → "Bón phân hữu cơ / NPK", `spraying` → "Phun thuốc phòng trừ sâu bệnh", `pruning` → "Cắt tỉa cành & neo trái", `treatment` → "Điều trị bệnh thực địa", `none` → "Kiểm tra sức khỏe định kỳ".
3. **Sinh `type`** từ `actionTaken` (`none` và các giá trị không map được → `health_check`).
4. **Tính lại `healthScore`** — công thức đang ở `App.tsx:125-128`, cũng chuyển sang BE (client không được gửi điểm lên):
   - `healthy`: `min(100, max(88, score + 5))`
   - `monitoring`: `min(84, max(70, score))`
   - `problem`: `min(65, max(45, score - 15))`
   > Đây là heuristic của bản demo. Khi có tiêu chí VietGAP thật, sửa **một hàm** ở BE là mọi client đổi theo — lý do chính để không để nó ở FE.
5. **INSERT `tree_history`** (append-only) và **UPDATE `trees`**: `status`, `health_score`, các số đo có gửi, `last_updated`, `last_updated_by`, `image_url` = ảnh đầu tiên nếu có.
6. **Trả về cây đã cập nhật kèm history** → FE thay thẳng vào state, không cần gọi lại `GET`.

**Chống ghi trùng (bắt buộc, không phải tính năng xa xỉ):** người dùng ở góc vườn mất sóng sẽ bấm Lưu nhiều lần. `clientRequestId` lưu `UNIQUE` trong `tree_history`; request trùng → trả lại bản ghi cũ với `200`, không tạo mới.

---


---

## 3. HTTP semantics
- 200/201: success.
- 400: invalid request.
- 401: unauthenticated.
- 403: authenticated nhưng không đủ quyền.
- 404: resource không tồn tại.
- 409: conflict.
- 422: validation error nếu framework áp dụng.
- 500: unexpected server error.

## 4. Error format
Dùng một format thống nhất, ví dụ:
```json
{
  "error": {
    "code": "TREE_NOT_FOUND",
    "message": "Không tìm thấy cây",
    "details": {}
  }
}
```

## 5. Pagination
Danh sách lớn phải hỗ trợ pagination. Không trả toàn bộ dataset vô hạn.

## 6. API rules
- Không tin dữ liệu authorization từ FE.
- Không trả field nhạy cảm không cần thiết.
- Validate ownership/farm scope.
- Có request ID/logging để debug.
- API docs phải cập nhật cùng code.
