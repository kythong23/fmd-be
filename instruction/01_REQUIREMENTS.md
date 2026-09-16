# 01 — REQUIREMENTS

> Quyết định ràng buộc: `09_DECISIONS.md`. Luật làm việc: `08_AI_RULES.md`.

## 1. Mục tiêu
Xây dựng hệ thống quản lý tình trạng cây sầu riêng qua mã QR, ưu tiên Web responsive/mobile-first để sử dụng trực tiếp tại vườn.

MVP phải dùng được thực tế, ưu tiên tính đúng và ổn định hơn số lượng tính năng.

## 2. Người dùng
- **Quản lý/Chủ vườn**: quản lý vườn, cây, vị trí, xem lịch sử, cập nhật tình trạng.
- **Nhân công**: quét QR, xem thông tin, cập nhật tình trạng; có thể được gán khu vực/lô phụ trách.
- **Khách xem**: đăng nhập và chỉ xem thông tin.

> **Mọi truy cập thông tin cây đều cần tài khoản nội bộ** — không có chế độ xem công khai (`09_DECISIONS.md` D1).

## 3. Chức năng MVP
1. Đăng nhập và phân quyền 3 vai trò.
2. Quản lý vườn.
3. Tạo/sửa/xóa hồ sơ cây.
4. Mỗi cây có mã định danh và QR duy nhất.
5. Sinh QR và hỗ trợ xuất hàng loạt để in.
6. URL QR dạng `https://<domain>/tree/<mã-cây>` — path thật, hosting phải có SPA fallback (`09_DECISIONS.md` D2).
7. Trang thông tin cây:
   - mã cây
   - giống
   - tuổi/năm trồng
   - vị trí
   - ảnh đại diện
   - tình trạng hiện tại
   - cập nhật gần nhất
8. Form cập nhật nhanh:
   - loại cập nhật
   - ghi chú
   - ảnh minh chứng tùy chọn
9. Lưu lịch sử cập nhật theo timeline.
10. Bản đồ 2D nền ảnh Google/layout, MVP chỉ xem vị trí cây.
11. Phân quyền thao tác theo vai trò.

## 4. Sau MVP
### Giai đoạn 2
- Kéo-thả thay đổi vị trí cây.
- Hybrid coordinate: lat/lng là dữ liệu gốc, FE quy đổi sang pixel.
- Timeline đầy đủ.
- PWA/offline và đồng bộ.
- Phân quyền chi tiết hơn.

### Giai đoạn 3
- React Native mobile app.
- Thống kê/báo cáo.
- Cảnh báo.
- Hoàn thiện multi-farm.
- Tích hợp hệ thống thứ ba.

## 5. Yêu cầu phi chức năng
- Mobile-first, thao tác ngoài trời nhanh.
- Responsive.
- API độc lập với FE.
- Kiến trúc module hóa, dễ mở rộng.
- Multi-farm ngay từ data model.
- Ảnh lưu cloud storage.
- Không khóa core vào một bên thứ ba.
- Có audit/history cho thay đổi quan trọng.
- Ưu tiên bảo mật và kiểm soát quyền.

## 6. Quy mô ban đầu
- 1 vườn.
- Khoảng 250 cây.
- Kiến trúc phải sẵn sàng cho nhiều vườn.

## 7. Nguyên tắc phạm vi
Không tự ý thêm tính năng ngoài tài liệu. Tính năng chưa thuộc MVP phải được đánh dấu backlog, không làm ảnh hưởng tiến độ MVP.
