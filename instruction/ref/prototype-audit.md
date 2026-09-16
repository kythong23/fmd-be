# REF — AUDIT PROTOTYPE `durian-tree/`

> ⚠️ **TÀI LIỆU THAM CHIẾU, KHÔNG PHẢI LỆNH THI CÔNG.**
> Mô tả prototype `durian-tree/` đang chạy bằng mock. Dùng để: (1) hiểu nghiệp vụ và nội dung từng màn hình, (2) tham khảo UI khi dựng FE mới, (3) tránh lặp lại các lỗi ở §6.
> Spec thi công FE là `05_FRONTEND.md`. Prototype **không** phải code base (`09_DECISIONS.md` D3).

---

## 1. Stack thực tế (đang dùng)

| Thành phần | Công nghệ thật trong repo | Ghi chú |
|---|---|---|
| Build tool | **Vite 6** (`vite.config.ts`, port 3000, host 0.0.0.0) | Không dùng Next.js. Không có SSR. |
| UI | **React 19** + **TypeScript 5.8** | `src/main.tsx` → `src/App.tsx` |
| Styling | **Tailwind CSS v4** qua plugin `@tailwindcss/vite` | Không có file `tailwind.config`; theme mặc định + font `Plus Jakarta Sans` nạp từ `index.html` |
| Icon | `lucide-react` | Dùng xuyên suốt mọi component |
| QR | `qrcode` (npm) qua `src/utils/qrHelper.ts` | Tự sinh DataURL/SVG, **không** dùng `qrcode.react` |
| Hiệu ứng | `canvas-confetti` | Bắn confetti khi lưu cập nhật thành công |
| Routing | **Không có router** — `activeTab` state + hash `#/tree/<code>` | Xem mục 3 |
| Data | **Mock tĩnh** `src/data/mockTrees.ts` (16 cây) + `src/data/farmMapData.ts` | Chưa gọi API nào |

**Dependency thừa cần dọn** (`package.json` khai báo nhưng grep toàn bộ `src/` không có import nào): `@google/genai`, `express`, `dotenv`, `motion`, `@types/express`, `esbuild`, `tsx`, `autoprefixer`. Gỡ đi để build nhẹ và tránh hiểu nhầm dự án đã có server.

---

## 2. Cấu trúc thư mục thật

```
durian-tree/
  index.html                 # meta/OG + font, lang="vi"
  vite.config.ts             # react + tailwind plugin, port 3000
  src/
    main.tsx                 # createRoot
    App.tsx                  # 328 dòng — TOÀN BỘ state & handler của app
    index.css
    types/durian.ts          # 89 dòng — nguồn chuẩn của mọi kiểu dữ liệu
    data/
      mockTrees.ts           # 727 dòng — INITIAL_TREES (16 cây) + STATUS_CONFIG
      farmMapData.ts         # 338 dòng — ranh giới thửa đất, liếp, mương, tiện ích, mốc trắc địa, preset vùng trồng
    utils/qrHelper.ts        # sinh QR DataURL/SVG + downloadFile
    components/
      Navbar.tsx  Sidebar.tsx  MobileBottomNav.tsx      # khung layout
      Dashboard.tsx (528)     TreeList.tsx  TreeCard.tsx
      TreePassport.tsx (311)  HealthStatus.tsx  TreeHistory.tsx
      FarmMap.tsx (714)       CadastralBenchmarkModal.tsx (894)
      QRManagement.tsx (323)  QRCodeCard.tsx  QRCodeDetailModal.tsx
      QRScannerModal.tsx (266)  UpdateTreeModal.tsx (542)
      FarmActivity.tsx  FarmSettings.tsx
```

Tổng ~6.900 dòng TS/TSX. Không có `hooks/`, `lib/api.ts`, `types/user.ts` — vì chưa có tầng API và chưa có người dùng/phân quyền.

---

## 3. Điều hướng: cách app đang chạy

`App.tsx` giữ 3 nhóm state:
- `activeTab`: `dashboard | passport | history | qrcodes | trees | map | activity | settings`
- `selectedTreeId`: cây đang xem (mặc định `SD-001`)
- 3 state modal: `isScannerOpen`, `isUpdateModalOpen`, `isQRDetailOpen`

Hash routing tối giản (`useEffect` nghe `hashchange`): URL dạng `#/tree/SD-001` → tìm cây theo `code` → mở tab `passport`. Khi chọn cây, app tự set `window.location.hash`.

> **LỖI CỦA PROTOTYPE (đã có hướng xử lý)**: QR in ra trỏ tới `${window.location.origin}/tree/${tree.code}` nhưng prototype dùng hash routing → mở URL đó bị **404** (`QRCodeCard.tsx:20`, `QRCodeDetailModal.tsx:36`).
> FE mới: giữ nguyên `/tree/:code` (`09_DECISIONS.md` D2), dùng `createBrowserRouter` + **bật SPA fallback ở hosting**. Không dùng hash.

---

## 4. Các màn hình đã có (và còn thiếu gì)

### 4.1. Dashboard (`Dashboard.tsx`)
Đã có: đếm cây theo 4 trạng thái (`healthy`/`monitoring`/`problem`/`unknown`), tìm theo mã + giống, lọc theo trạng thái, mini bản đồ (vẽ lại liếp/mương/cây từ `TREE_SPATIAL_MAP`), nút mở scanner, điều hướng sang Map/Trees. Đọc mốc trắc địa từ `localStorage['durian_cadastral_benchmark']`.

### 4.2. Digital Passport (`TreePassport.tsx` + `HealthStatus.tsx`) — **màn hình lõi**
Hiển thị: ảnh chính + gallery, mã cây, giống, tuổi, ngày trồng, vị trí (lô/hàng/vị trí), badge trạng thái, điểm sức khỏe (`healthScore` 0–100, đổi màu ở ngưỡng 85/70), độ ẩm đất, tình trạng lá (4 mức), ra hoa, trái, chiều cao, đường kính thân, lần cập nhật cuối + người cập nhật. Nút: cập nhật tình trạng, xem lịch sử, xem QR.

### 4.3. Lịch sử cây (`TreeHistory.tsx`)
Timeline `tree.history` (mới nhất trước), mỗi bản ghi có ngày/giờ, loại (`health_check`/`watering`/`fertilizing`/`spraying`/`pruning`/`treatment`/`harvest`), mô tả, người thực hiện, liều lượng, ảnh, số đo.

### 4.4. Modal cập nhật tình trạng (`UpdateTreeModal.tsx`) — **luồng nhập liệu chính**
Form: chọn trạng thái → chọn nhiều tag bộ phận (`leaf/stem/branch/flower/fruit/pest/soil/other`) → mô tả → ảnh (chọn file thật hoặc 4 ảnh preset) → 4 số đo (chiều cao / đường kính thân / ẩm đất / số trái) → hành động đã làm (`watering/fertilizing/spraying/pruning/treatment/none`) → ghi chú → người thực hiện. Submit → confetti + màn hình xác nhận thành công.

> **CÒN THIẾU / RỦI RO**:
> - Ảnh dùng `URL.createObjectURL(file)` → chỉ sống trong tab hiện tại, **reload là mất**. Cần upload thật (`04_API.md` §1 — Uploads).
> - Chưa validate (mô tả rỗng bị điền câu mặc định; số đo không chặn giá trị âm/vô lý).
> - Chưa chặn double-submit khi mạng vườn chập chờn.

### 4.5. Bản đồ vườn (`FarmMap.tsx` + `CadastralBenchmarkModal.tsx`)
Đã có, và **mạnh hơn kế hoạch cũ nhiều**:
- Vẽ toàn bộ bằng **SVG thuần** (không dùng Konva): polygon ranh giới thửa đất 6 mốc M1–M6, liếp (`FARM_BEDS`), mương (`FARM_CANALS`), đường nội bộ, hồ trữ nước, 6 tiện ích (cổng / nhà điều hành / kho / trạm bơm / trạm khí tượng / khu sơ chế).
- Bật/tắt từng layer (`items` state), nút reset về chỉ khung thửa đất, nút hiện tất cả.
- Click gốc cây → panel thông tin nhanh → mở passport.
- `CadastralBenchmarkModal` (894 dòng): đặt mốc trắc địa trung tâm bằng cách dán link Google Maps / tọa độ thập phân / DMS (regex parse ở `:124-133`), chọn preset 7 vùng trồng sầu riêng VN, micro-adjust ±0.0001° theo 4 hướng, đổi kiểu bản đồ (vệ tinh/địa hình/thường), lưu `localStorage`.

**Mô hình tọa độ thực tế khác tài liệu cũ**: không dùng affine 2–4 anchor. `farmMapData.ts` dùng **offset đơn giản** — `getDerivedBoundaryPoints(center)` cộng `Δlat/Δlng` (chênh lệch giữa mốc trung tâm mới và mốc gốc `10.4604 / 107.2165`) vào 6 mốc ranh giới. Vị trí cây trên bản đồ là **pixel cứng** trong `TREE_SPATIAL_MAP` (x, y, liếp, mô, bán kính tán), không suy ra từ lat/lng.

> Hệ quả: dịch mốc trung tâm chỉ **tịnh tiến** bản vẽ, không xoay/co giãn theo thực địa. Đủ dùng cho demo và cho bản vẽ tay 2,8 ha. Chỉ nâng lên affine 2 điểm mốc khi thật sự cần chồng khớp ảnh vệ tinh — khi đó sửa đồng bộ cả BE/DB.

### 4.6. Quản lý QR (`QRManagement.tsx`, `QRCodeCard.tsx`, `QRCodeDetailModal.tsx`)
- Lưới thẻ QR mọi cây, tìm theo mã/giống, lọc theo lô A/B/C.
- Tạo cây mới ngay trong modal (mã, giống, ngày trồng, lô/hàng/vị trí, trạng thái) → tự tính tuổi cây, tự tạo bản ghi lịch sử "Gắn thẻ QR & Khởi tạo Digital Passport".
- `qrHelper.ts`: QR mức sửa lỗi **H**, màu `#064e3b` trên nền trắng, 320px; xuất PNG (DataURL) hoặc SVG qua `downloadFile`.
- In hàng loạt: `window.print()`.

> **CÒN THIẾU**: chưa có CSS `@media print` → bản in kèm cả navbar/sidebar. Thêm một block `@media print` trong `index.css` ẩn khung layout là đủ, không cần `jspdf`.

### 4.7. Quét QR (`QRScannerModal.tsx`)
Đã mở camera thật (`getUserMedia`, `facingMode: 'environment'`), fallback viewfinder mô phỏng khi bị từ chối quyền, nút đèn pin (UI), tra mã → mở passport, báo lỗi khi không tìm thấy mã.

> **CÒN THIẾU (quan trọng)**: **chưa giải mã QR thật** — luồng hiện tại là `handleSimulateScan(code)`, bấm chọn mã có sẵn. Muốn quét thật: dùng `BarcodeDetector` có sẵn của trình duyệt (Chrome Android hỗ trợ, ~15 dòng, không thêm dependency), chỉ fallback thư viện (`zxing-wasm`/`jsqr`) cho iOS Safari nếu bắt buộc.

### 4.8. Nhật ký vườn (`FarmActivity.tsx`)
Gom `history` của mọi cây thành một feed, lọc theo loại hoạt động + tìm kiếm, click để nhảy về cây.

> **RỦI RO**: đang sắp xếp bằng `b.id.localeCompare(a.id)` (`:41-44`) — `id` dạng `h-001-2` trộn với `h-1737...` nên thứ tự sai. Sửa bằng cách dùng một mốc thời gian ISO thật (mục 6, dòng 4).

### 4.9. Cài đặt (`FarmSettings.tsx`)
Form tên trang trại, kỹ thuật viên trưởng ca, tọa độ mốc trung tâm, công tắc đồng bộ ngoại tuyến, thông báo "Chế độ xem công khai: Đang bật".

> **CÒN THIẾU**: form **không lưu đi đâu cả** (chỉ hiện "Đã lưu thành công" 2,5 s). Và "chế độ xem công khai" **mâu thuẫn** với yêu cầu "mọi truy cập đều cần tài khoản" ở tổng quan — đã được chốt là **bắt buộc đăng nhập** (đã chốt: `09_DECISIONS.md` D1 — bắt buộc đăng nhập).

---

## 5. Mô hình state hiện tại & cách chuyển sang API

Toàn bộ dữ liệu nằm trong **một** `useState<DurianTree[]>(INITIAL_TREES)` ở `App.tsx`; mọi thay đổi đi qua 2 handler:

| Handler | Việc đang làm | Khi có BE sẽ thành |
|---|---|---|
| `handleSaveUpdate` | Tạo `HistoryRecord` mới, prepend vào `tree.history`, cập nhật số đo, **tự tính lại `healthScore`** (healthy: +5, kẹp 88–100; monitoring: kẹp 70–84; problem: −15, kẹp 45–65) | `POST /trees/:code/history` rồi refetch cây |
| `handleAddNewTree` | Điền giá trị mặc định cho cây mới, prepend vào mảng | `POST /trees` |

**Thứ tự nối BE (ít rủi ro nhất trước):**
1. Thêm `src/lib/api.ts` (fetch + base URL từ `import.meta.env.VITE_API_URL`).
2. Thay `useState(INITIAL_TREES)` bằng fetch danh sách cây; **giữ nguyên kiểu `DurianTree` làm response** để không phải sửa component nào.
3. Chuyển công thức `healthScore` sang BE (`04_API.md` §2) — FE chỉ hiển thị.
4. Thay `URL.createObjectURL` bằng upload thật, lấy URL trả về bỏ vào `images`.
5. Giữ `mockTrees.ts` làm dữ liệu seed cho DB (`03_DATABASE.md` §8).

Chưa cần TanStack Query/Zustand ở bước này — 16 cây và một mảng state là đủ. Thêm khi thật sự có nhiều màn hình cùng cần cache.

---

## 6. Nợ kỹ thuật cần trả (ưu tiên từ trên xuống)

| # | Vấn đề | Vị trí | Mức |
|---|---|---|---|
| 1 | QR trỏ tới URL không tồn tại trong SPA | `QRCodeCard.tsx:20`, `QRCodeDetailModal.tsx:36` | Cao — QR in ra không dùng được |
| 2 | Scanner chưa giải mã QR thật | `QRScannerModal.tsx` | Cao |
| 3 | Ảnh upload mất khi reload | `UpdateTreeModal.tsx:114-120` | Cao |
| 4 | `date` + `time` là 2 chuỗi rời (`dd/mm/yyyy`, `HH:mm`) → sort sai | `types/durian.ts`, `FarmActivity.tsx:41` | Cao — gộp về 1 trường ISO |
| 5 | Logic format ngày lặp ở 4+ component | `App.tsx`, `UpdateTreeModal`, `HealthStatus`, ... | Trung bình — gom vào `utils/date.ts` |
| 6 | `trees.length + 1` sinh mã cây → trùng mã sau khi xoá | `App.tsx:159`, `QRManagement.tsx:34` | Trung bình — để BE sinh mã |
| 7 | Dependency thừa trong `package.json` | `package.json` | Thấp |
| 8 | Chưa có CSS `@media print` | `index.css` | Thấp |

---