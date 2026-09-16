# 07 — DESIGN SYSTEM

> **Giá trị token cụ thể (color/typography/spacing/radius/shadow) nằm ở `05_FRONTEND.md` §3** — file này định nghĩa *nguyên tắc*, file kia định nghĩa *giá trị*. Khi lệch nhau, `05_FRONTEND.md` §3 thắng.
> Tham chiếu hình ảnh: prototype `durian-tree/` (bố cục, nhãn tiếng Việt, cách trình bày passport/bản đồ).

## 1. Mục tiêu
UI phải hiện đại, sạch, dễ đọc, thân thiện với người dùng tại vườn; đồng thời nhất quán và dễ mở rộng.

## 2. UX priorities
Thứ tự ưu tiên:
1. Dễ hiểu.
2. Dễ thao tác.
3. Đọc rõ ngoài trời.
4. Phản hồi tức thời.
5. Nhất quán.
6. Đẹp.

Không hy sinh usability để tạo hiệu ứng.

## 3. Visual language
Nên lấy cảm hứng từ:
- thiên nhiên
- nông nghiệp
- cây sầu riêng
- bản đồ/vườn

Nhưng tránh biến giao diện thành theme trang trí quá mức.

## 4. Design tokens
Token khai báo bằng `@theme` của Tailwind v4 trong `src/styles/index.css` (giá trị: `05_FRONTEND.md` §3.2). Cần có token cho:
- color
- typography
- spacing
- radius
- shadow
- border
- z-index
- motion

Không hard-code các giá trị lặp lại trong từng component.

## 5. Color semantics
Cần có semantic colors:
- primary
- success
- warning
- danger
- info
- neutral

Trạng thái cây phải có icon + text/label, không chỉ dựa vào màu để đảm bảo accessibility.

## 6. Typography
- Ưu tiên font dễ đọc tiếng Việt.
- Hierarchy rõ.
- Body text dễ đọc trên mobile.
- Số liệu/mã cây cần dễ scan.

## 7. Components
Xây dựng reusable:
- Button
- Input
- Select
- Textarea
- Modal/Drawer
- Card
- Badge/Status
- Toast
- Tabs
- Table/List
- Timeline
- Empty State
- Loading/Skeleton
- Error State
- Map Marker
- Image Upload

## 8. Forms
Form cập nhật tại vườn:
- ít field
- option rõ
- thao tác nhanh
- nút submit dễ chạm
- xác nhận thành công rõ ràng
- tránh modal nhiều tầng

## 9. Map UX
Marker phải:
- nhìn thấy rõ
- không che nhau quá mức
- click dễ
- có trạng thái trực quan
- mở quick detail nhanh

Manager khi có drag/drop phải nhận feedback về vị trí mới và trạng thái lưu.

## 10. Responsive
Thiết kế từ mobile trước rồi mở rộng desktop.
Không chỉ shrink desktop UI xuống mobile.

## 11. Accessibility
- contrast đủ
- keyboard navigation nơi phù hợp
- focus state
- label cho form
- alt text
- không phụ thuộc màu duy nhất
- touch target đủ lớn

## 12. Motion
Animation nhẹ, có mục đích.
Không dùng animation gây chậm hoặc gây khó chịu khi thao tác ngoài trời.

## 13. Definition of Done cho UI
Một màn hình chỉ hoàn thành khi có:
- desktop/mobile layout
- loading
- error
- empty
- success feedback
- permission behavior
- responsive
- accessibility cơ bản
