# 08 — AI RULES

> Đọc file này **đầu tiên**, rồi tới `09_DECISIONS.md`. Bản đồ tài liệu: `00_README.md`.

## 1. Vai trò của AI
AI là engineering assistant. AI phải xây dựng hệ thống theo tài liệu dự án, không tự thay đổi product scope.

## 2. Source of truth
Thứ tự ưu tiên:
1. Yêu cầu/Quyết định mới nhất của người dùng.
2. `09_DECISIONS.md` — các quyết định đã chốt.
3. Các file specification `01`–`07` trong thư mục này.
4. Code và schema hiện tại.
5. `ref/` — tham chiếu lịch sử, **không phải lệnh thi công**.
6. Kiến thức/framework mặc định của AI.

Nếu phát hiện mâu thuẫn, **không tự âm thầm chọn**. Nêu rõ mâu thuẫn, đề xuất cách xử lý, và sau khi người dùng chốt thì **ghi vào `09_DECISIONS.md`** — không sửa rải rác nhiều file.

## 3. Trước khi code
AI phải:
1. Đọc các file liên quan.
2. Xác định phạm vi task.
3. Kiểm tra architecture hiện tại.
4. Kiểm tra dependency/code có sẵn.
5. Xác định tác động đến DB/API/FE.
6. Chỉ sau đó mới sửa code.

## 4. Không tự ý
Không tự ý:
- đổi tech stack
- đổi database
- bỏ authentication/authorization
- thay đổi API contract
- đổi data model quan trọng
- thêm dependency lớn
- thêm feature ngoài scope
- xóa dữ liệu/code đang dùng
- hard-code dữ liệu thật vào UI

Nếu cần thay đổi kiến trúc, phải giải thích lý do và phạm vi ảnh hưởng.

## 5. Coding standards
- Code dễ đọc trước khi tối ưu.
- DRY nhưng không abstraction quá mức.
- Single Responsibility.
- Tên biến/hàm rõ nghĩa.
- Không duplicate business logic.
- Error handling rõ ràng.
- Type-safe nếu stack hỗ trợ.
- Không để TODO quan trọng mà không ghi rõ lý do.

## 6. Database changes
Mọi thay đổi schema:
- cập nhật migration
- cập nhật model/type
- cập nhật API nếu cần
- kiểm tra backward compatibility
- không sửa DB production thủ công để né migration

## 7. API changes
Nếu đổi API:
- cập nhật API documentation
- cập nhật FE consumer
- cập nhật validation/types
- xem xét backward compatibility

## 8. Security
Luôn kiểm tra:
- authentication
- authorization
- input validation
- injection
- file upload
- sensitive data exposure
- token/session handling
- rate limiting nếu endpoint cần

Không tin dữ liệu permission từ frontend.

## 9. Frontend
- Dùng design-system components.
- Không copy/paste UI.
- Không gọi API trực tiếp ở mọi component.
- Có loading/error/empty/success states.
- Mobile-first.
- Permission UI chỉ là UX; backend mới là nơi enforce quyền.

## 10. Map
Không thay đổi logic coordinate tùy tiện (`09_DECISIONS.md` D5).
Định hướng chính:
- lat/lng = dữ liệu thực địa gốc
- pixel x/y = lớp hiển thị
- calibration map = metadata của nền bản đồ
- drag/drop chỉ Manager ở giai đoạn 2

## 11. Testing
Sau mỗi thay đổi đáng kể:
- chạy lint/typecheck
- chạy test liên quan
- build nếu phù hợp
- kiểm tra regression ở flow chính

Critical flows:
- login
- QR → tree detail
- permission
- update status
- map
- media upload

## 12. Output khi hoàn thành task
AI nên báo cáo ngắn:
- đã thay đổi gì
- file nào thay đổi
- migration/API nào thay đổi
- test/check đã chạy
- vấn đề còn lại
- quyết định cần người dùng xác nhận

## 13. Nguyên tắc MVP
Nếu có nhiều cách:
- chọn cách đơn giản hơn
- ít dependency hơn
- dễ bảo trì hơn
- đáp ứng đúng requirement
- không over-engineer

## 14. Quy tắc khi thiếu thông tin
Nếu thông tin thiếu nhưng có thể chọn một default an toàn, chọn default và ghi rõ assumption.
Nếu lựa chọn ảnh hưởng lớn đến architecture/data/security/product behavior, phải hỏi hoặc yêu cầu xác nhận trước khi triển khai.

## 15. Definition of Done
Task chưa được coi là hoàn thành nếu:
- code chạy nhưng không có error handling cần thiết
- phá permission
- làm lệch API contract
- thiếu migration khi đổi DB
- bỏ responsive cho flow mobile
- thiếu loading/error/empty state ở màn hình dữ liệu
- không kiểm tra các flow liên quan
