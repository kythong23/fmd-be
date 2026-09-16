# 05 — FRONTEND
### Dự án: Quản lý tình trạng cây sầu riêng qua mã QR (Durian QR)

> **Tài liệu này là spec để implement FE từ đầu.** Đọc hết mục 0–3 trước khi viết dòng code đầu tiên.
> Prototype `durian-tree/` là **tham chiếu UI và nghiệp vụ** — xem bố cục màn hình, nhãn tiếng Việt, nội dung trường dữ liệu ở đó rồi dựng lại theo spec này. Audit chi tiết + danh sách lỗi không được lặp lại: `ref/prototype-audit.md`. **Không copy component sang** (`09_DECISIONS.md` D3).

---

## 0. QUYẾT ĐỊNH ĐÃ CHỐT

| Vấn đề | Chốt |
|---|---|
| Xuất phát | **Build mới từ đầu** (`09_DECISIONS.md` D3). Prototype `durian-tree/` dùng để tham chiếu UI + nghiệp vụ |
| Auth | **Login bắt buộc** (D1), 3 vai trò: `manager` / `worker` / `viewer`. Không có chế độ xem công khai. Quét QR khi chưa đăng nhập → `/login?next=/tree/:code` |
| Phạm vi | **MVP** (mục 11 tổng quan): login, quản lý cây + QR, passport, form cập nhật, bản đồ 2D *chỉ xem* |
| Data | **Mock qua tầng `services/` trả Promise**, contract khớp `04_API.md`. Đổi sang API thật = đổi 1 tầng, không sửa component |
| Quy mô | ~250 cây, 1 vườn — nhưng mọi type/route đã có `farmId` sẵn |

**Ngoài phạm vi MVP** (không code, nhưng không được thiết kế cản trở): kéo-thả cây trên map, PWA offline sync, thống kê/báo cáo, app mobile, multi-farm UI.

**Thứ tự ưu tiên khi đánh đổi:**
`Usability → Consistency → Maintainability → Accessibility → Performance → Visual polish`

---

## 1. STACK

| Thành phần | Chọn | Lý do |
|---|---|---|
| Build | **Vite 6** | Nhanh, không cần SSR (app nội bộ sau login) |
| UI | **React 19 + TypeScript 5.8** (`strict: true`) | — |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`) | Tokens khai báo bằng `@theme` → vừa là CSS variable vừa là utility class |
| Router | **react-router v7** (`createBrowserRouter`) | QR phải trỏ path thật `/tree/:code`; hash routing làm URL xấu và khó share |
| Icon | **lucide-react** — dùng **duy nhất** thư viện này | Mục 10 |
| Form | **react-hook-form + zod** | Validate khai báo, không tự viết |
| Server state | **TanStack Query v5** | Có sẵn loading/error/cache/refetch |
| Global state | **React Context** cho `auth`. Không Redux/Zustand ở MVP | Chỉ global khi thật cần |
| QR sinh | `qrcode` | — |
| QR quét | `BarcodeDetector` native, fallback `zxing-wasm` cho iOS Safari | Không tải dependency nặng nếu không cần |
| Font | `Plus Jakarta Sans` | — |

**Không thêm dependency nào khác** nếu chưa có lý do ghi rõ trong PR.

**Hosting bắt buộc có SPA fallback** (rewrite mọi path → `index.html`), nếu không QR in ra sẽ 404.

---

## 2. CẤU TRÚC THƯ MỤC

```
src/
├── app/
│   ├── router.tsx              # route tree + lazy() + guard
│   ├── providers.tsx           # QueryClient + AuthProvider + Toaster
│   └── main.tsx
│
├── components/
│   ├── ui/                     # generic, KHÔNG chứa business logic
│   │   ├── Button/  Input/  Select/  Textarea/  Checkbox/  Radio/
│   │   ├── Badge/  Card/  Modal/  Drawer/  Tabs/  Tooltip/  Dropdown/
│   │   ├── Table/  Pagination/  Skeleton/  Avatar/  Toast/
│   │   └── index.ts            # barrel export
│   ├── layout/
│   │   ├── AppLayout.tsx  Sidebar.tsx  Header.tsx
│   │   └── MobileBottomNav.tsx  PageContainer.tsx  PageHeader.tsx
│   └── shared/                 # dùng chung nhiều feature, có chút domain
│       ├── StateBoundary.tsx   # loading/error/empty/success — mục 8
│       ├── EmptyState.tsx  ErrorState.tsx  ConfirmDialog.tsx
│       └── PhotoUploader.tsx  DateText.tsx
│
├── features/
│   ├── auth/         { components/ hooks/ schemas/ pages/ }
│   ├── trees/        # danh sách, tạo, passport, lịch sử
│   ├── updates/      # form cập nhật tình trạng
│   ├── qr/           # sinh, xem, in QR + scanner
│   ├── map/          # bản đồ 2D (chỉ xem ở MVP)
│   └── dashboard/
│
├── hooks/            # useMediaQuery, useDebounce, useDisclosure...
├── services/         # TẦNG DUY NHẤT chạm dữ liệu
│   ├── http.ts       # fetch wrapper + base URL + error normalize
│   ├── query-keys.ts
│   ├── trees.service.ts  auth.service.ts  qr.service.ts  farm.service.ts
│   └── mock/         # dữ liệu seed + delay giả lập
├── stores/           # chỉ auth-context.tsx ở MVP
├── types/            # tree.ts  user.ts  farm.ts  history.ts  api.ts
├── utils/            # date.ts  format.ts  geo.ts  health-score.ts  qr.ts
├── constants/        # routes.ts  roles.ts  status-config.ts  activity-types.ts
├── styles/
│   ├── index.css     # @import tailwind + @theme tokens
│   └── print.css     # @media print cho in QR
└── assets/
```

**Quy tắc folder feature:** mỗi feature tự chứa `components/`, `hooks/`, `schemas/`, `pages/`. Feature **không được import** từ feature khác — dùng chung thì đẩy lên `components/shared/` hoặc `services/`.

**Quy tắc Page:** file trong `features/*/pages/` chỉ **composition + orchestration**. Không fetch trực tiếp (gọi hook), JSX không quá 150 dòng.

---

## 3. DESIGN SYSTEM

### 3.1. Nguyên tắc

**Không hard-code giá trị UI ở bất kỳ component nào.** Mọi màu / khoảng cách / font-size / radius / shadow phải đến từ token. Đổi primary color = sửa 1 dòng trong `styles/index.css`.

Tailwind v4 khai báo token bằng `@theme` → tự sinh cả CSS variable (`var(--color-primary)`) và utility class (`bg-primary`). Dùng utility class trong JSX; dùng CSS variable khi cần trong SVG/canvas.

### 3.2. Token file — `src/styles/index.css`

```css
@import "tailwindcss";

@theme {
  /* ---------- COLOR: brand ---------- */
  --color-primary:          #047857;   /* xanh lá đậm — chủ đạo nông nghiệp */
  --color-primary-hover:    #065f46;
  --color-primary-subtle:   #d1fae5;   /* nền badge/alert nhạt */
  --color-primary-fg:       #ffffff;   /* chữ trên nền primary */

  --color-secondary:        #78716c;
  --color-secondary-hover:  #57534e;
  --color-secondary-subtle: #f5f5f4;

  /* ---------- COLOR: semantic status ---------- */
  --color-success:          #16a34a;   /* cây khỏe */
  --color-success-subtle:   #dcfce7;
  --color-warning:          #d97706;   /* cây cần theo dõi */
  --color-warning-subtle:   #fef3c7;
  --color-error:            #dc2626;   /* cây có vấn đề */
  --color-error-subtle:     #fee2e2;
  --color-info:             #0284c7;
  --color-info-subtle:      #e0f2fe;
  --color-neutral:          #64748b;   /* chưa rõ */
  --color-neutral-subtle:   #f1f5f9;

  /* ---------- COLOR: surface & text ---------- */
  --color-background:       #f8fafc;
  --color-surface:          #ffffff;
  --color-surface-hover:    #f1f5f9;
  --color-surface-sunken:   #f1f5f9;
  --color-text-primary:     #0f172a;
  --color-text-secondary:   #475569;
  --color-text-muted:       #94a3b8;
  --color-text-inverse:     #ffffff;
  --color-border:           #e2e8f0;
  --color-border-strong:    #cbd5e1;
  --color-focus-ring:       #047857;
  --color-disabled-bg:      #f1f5f9;
  --color-disabled-fg:      #94a3b8;

  /* ---------- TYPOGRAPHY ---------- */
  --font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, monospace;  /* mã cây, tọa độ */

  --text-display:    2.25rem;
  --text-h1:         1.875rem;
  --text-h2:         1.5rem;
  --text-h3:         1.25rem;
  --text-h4:         1.125rem;
  --text-body:       1rem;
  --text-body-sm:    0.875rem;
  --text-caption:    0.75rem;
  --text-label:      0.875rem;
  --text-button:     0.9375rem;

  /* ---------- SPACING (scale 4px) ---------- */
  --spacing: 0.25rem;   /* Tailwind v4 nhân từ đây: p-1=4px, p-4=16px... */

  /* ---------- RADIUS ---------- */
  --radius-sm:   0.25rem;
  --radius-md:   0.5rem;    /* mặc định: input, button, badge */
  --radius-lg:   0.75rem;   /* card, modal */
  --radius-xl:   1rem;
  --radius-full: 9999px;

  /* ---------- SHADOW ---------- */
  --shadow-sm:  0 1px 2px 0 rgb(15 23 42 / 0.05);
  --shadow-md:  0 4px 12px -2px rgb(15 23 42 / 0.08);
  --shadow-lg:  0 12px 32px -8px rgb(15 23 42 / 0.14);

  /* ---------- BREAKPOINT ---------- */
  --breakpoint-sm: 640px;    /* mobile lớn */
  --breakpoint-md: 768px;    /* tablet */
  --breakpoint-lg: 1024px;   /* desktop */
  --breakpoint-xl: 1280px;   /* large desktop */

  /* ---------- MOTION ---------- */
  --transition-fast: 120ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 320ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Z-INDEX — khai báo tập trung, không tự chế số rải rác */
:root {
  --z-sticky: 10; --z-dropdown: 30; --z-overlay: 40;
  --z-modal: 50;  --z-toast: 60;    --z-tooltip: 70;
  --overlay-bg: rgb(15 23 42 / 0.5);
}

/* Control height — Button/Input/Select cùng size phải cùng chiều cao */
:root { --control-sm: 2rem; --control-md: 2.5rem; --control-lg: 3rem; }

/* Tôn trọng người dùng tắt animation */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    transition-duration: .01ms !important;
  }
}
```

**Kiểm tra bắt buộc trước khi merge:** grep mã màu hex và `px` trong `src/features/` + `src/components/` — kết quả phải rỗng (trừ `src/styles/`, `utils/geo.ts`, thuộc tính SVG `viewBox`).

### 3.3. Color — quy tắc dùng

| Ý nghĩa | Token | Dùng ở |
|---|---|---|
| Hành động chính | `primary` | Primary button, link active, tab active |
| Cây khỏe (`healthy`) | `success` | Badge, chấm cây trên map |
| Cần theo dõi (`monitoring`) | `warning` | Badge, chấm cây |
| Có vấn đề (`problem`) | `error` | Badge, chấm cây, alert |
| Chưa rõ (`unknown`) | `neutral` | Badge, chấm cây |
| Thông tin/gợi ý | `info` | Banner hướng dẫn |

Trạng thái tương tác bắt buộc có cho **mọi** control: `hover / active / focus-visible / disabled / selected / loading / error`.

**Không dùng màu làm tín hiệu duy nhất:** badge trạng thái phải có **icon + chữ**; chấm cây trên map phải khác **hình dạng/viền** kèm legend.

### 3.4. Typography — quy tắc dùng

| Cấp | Dùng cho |
|---|---|
| `display` | Con số lớn ở Dashboard (tổng cây, điểm sức khỏe) |
| `h1` | Tiêu đề page — đúng 1 cái mỗi page |
| `h2` | Tiêu đề section |
| `h3` / `h4` | Tiêu đề card / nhóm field |
| `body` | Nội dung chính |
| `body-sm` | Mô tả phụ, nội dung trong table |
| `caption` | Timestamp, chú thích, helper text |
| `label` | Nhãn form |
| `button` | Text trong button |

Không dùng font-size ngoài scale. Mã cây và tọa độ dùng `font-mono`. Cỡ nhỏ nhất cho nội dung đọc được là `caption` (12px).

### 3.5. Spacing & Layout

Chỉ dùng bội số 4 (`p-2 p-3 p-4 p-6 p-8`). Cấm giá trị tùy hứng kiểu `margin: 13px`.

| Ngữ cảnh | Giá trị |
|---|---|
| Gap trong nhóm field | `gap-2` (8px) |
| Padding trong Card | `p-4` mobile / `p-6` desktop |
| Gap giữa các section | `gap-6` (24px) |
| Padding PageContainer | `px-4` mobile / `px-6` tablet / `px-8` desktop |
| Max width nội dung | `max-w-7xl` căn giữa |

Layout duy nhất cho toàn app:

```
AppLayout
 ├── Header            (sticky, mọi breakpoint)
 ├── Sidebar           (lg+: cố định 256px | <lg: Drawer)
 ├── PageContainer
 │    ├── PageHeader   (breadcrumb + h1 + mô tả + primary action)
 │    └── <Outlet/>
 └── MobileBottomNav   (<md only, 5 mục)
```

**Không tạo layout riêng cho từng page.** Ngoại lệ duy nhất: `/login` dùng `AuthLayout` (căn giữa, không sidebar).

---

## 4. COMPONENT ARCHITECTURE

### 4.1. Ranh giới tầng

| Tầng | Được phép | Cấm |
|---|---|---|
| `components/ui/` | props generic, token, a11y | import từ `services/`, `features/`, `types/tree` |
| `components/shared/` | ui + type domain | gọi API trực tiếp |
| `features/*/components/` | hook của chính feature, ui, shared | fetch trực tiếp |
| `features/*/hooks/` | gọi `services/` qua TanStack Query | render JSX |
| `services/` | `http.ts`, mock | import React |

### 4.2. API component — dùng variant, không nhân bản

```tsx
// ĐÚNG
<Button variant="primary" size="md" loading={isSubmitting} leftIcon={<Save />}>Lưu</Button>
<Button variant="secondary" size="sm">Hủy</Button>
<Button variant="ghost" size="sm" iconOnly aria-label="Đóng"><X /></Button>

// SAI — cấm tuyệt đối
<PrimaryButton /> <CustomButton /> <SaveButton /> <Button2 />
```

Variant chuẩn cho toàn app:

| Component | Props |
|---|---|
| `Button` | `variant: primary \| secondary \| ghost \| danger \| link`, `size: sm \| md \| lg`, `loading`, `disabled`, `leftIcon`, `rightIcon`, `iconOnly`, `fullWidth` |
| `Input` / `Select` / `Textarea` | `label`, `hint`, `error`, `required`, `size`, `leftIcon`, `disabled` |
| `Badge` | `variant: success \| warning \| error \| info \| neutral`, `size`, `icon` |
| `Card` | `padding: none \| sm \| md`, `interactive`, `as` |
| `Modal` | `size: sm \| md \| lg \| full`, `title`, `description`, `onClose`, `footer` |
| `Table` | `columns`, `data`, `loading`, `emptyState`, `onRowClick`, `sort`, `mobileVariant: cards \| scroll` |

**Trước khi tạo component mới:** tìm trong `components/ui/` xem đã có chưa. Chỉ khác vài thuộc tính → thêm variant, không tạo file mới.

**Component quá 200 dòng → tách.** Ưu tiên composition (`<Card><Card.Header/></Card>`) thay vì thêm prop boolean.

---

## 5. ROUTING & PHÂN QUYỀN

### 5.1. Route map

| Path | Màn hình | Quyền |
|---|---|---|
| `/login` | Đăng nhập | public |
| `/` | Dashboard | mọi role đã login |
| `/trees` | Danh sách cây | mọi role |
| `/tree/:code` | **Digital Passport** — đích của QR | mọi role |
| `/tree/:code/history` | Lịch sử cây | mọi role |
| `/map` | Bản đồ vườn (MVP: chỉ xem) | mọi role |
| `/qr` | Quản lý & in QR | `manager` |
| `/activity` | Nhật ký vườn | mọi role |
| `/settings` | Cài đặt vườn | `manager` |

**QR encode:** `${VITE_PUBLIC_URL}/tree/${code}` — path thật, không hash.

**Chưa login mà quét QR:** redirect `/login?redirect=/tree/SD-001`, login xong quay đúng về cây đó. Đây là luồng quan trọng nhất của sản phẩm, phải test kỹ.

### 5.2. Guard & permission

```
constants/roles.ts
  manager: tất cả + tạo/sửa/xóa cây, in QR, cài đặt, đổi vị trí cây (giai đoạn 2)
  worker:  xem tất cả + cập nhật tình trạng cây
  viewer:  chỉ xem
```

Một nơi duy nhất quyết định quyền: hook `useCan(action)` đọc từ `AuthContext`. Component gọi `useCan('tree:update')`, **không** viết `user.role === 'manager'` rải rác.

UI theo quyền: **ẩn** action không có quyền (không disable câm lặng). Vào thẳng URL không có quyền → trang `403` có giải thích + nút về Dashboard.

---

## 6. MÀN HÌNH MVP

Mỗi màn hình phải trả lời được 4 câu: *Tôi đang ở đâu? Page này làm gì? Thông tin quan trọng nhất? Làm gì tiếp theo?*

### 6.1. `/login`
Form tài khoản + mật khẩu. Label rõ, **không dùng placeholder thay label**. Lỗi sai mật khẩu hiển thị ở đầu form, không xóa dữ liệu đã nhập. Có loading khi submit. Giữ `?redirect=`.

### 6.2. `/` Dashboard
- 4 stat card: tổng cây, khỏe, theo dõi, có vấn đề — số dùng `display`, có icon, click lọc sang `/trees`.
- Danh sách **cây cần chú ý** (`problem` + chưa cập nhật > 14 ngày) — thông tin quan trọng nhất của page.
- Mini map click mở `/map`.
- Primary action: **Quét QR**, luôn thấy trên mobile.

### 6.3. `/trees` Danh sách
- Tìm theo mã/giống + lọc trạng thái + lọc lô. Filter lưu vào URL query (share/back được).
- Desktop: `Table` (mã, giống, lô/hàng, trạng thái, điểm sức khỏe, cập nhật cuối). Mobile: `Card` list.
- Pagination client-side 25/trang — 250 cây không cần virtualize.
- Loading = Skeleton rows. Empty phân biệt *"vườn chưa có cây"* và *"không khớp bộ lọc"* (kèm nút xóa lọc).

### 6.4. `/tree/:code` Digital Passport — **màn hình lõi**
Ưu tiên mobile-first: người dùng mở ngoài vườn bằng điện thoại, nắng chói, một tay.

Nội dung: ảnh chính + gallery, mã cây (`font-mono`, cỡ lớn), giống, tuổi, ngày trồng, vị trí lô/hàng/vị trí, badge trạng thái (icon + chữ), điểm sức khỏe 0–100 (đổi màu ở ngưỡng 85/70), độ ẩm đất, tình trạng lá, ra hoa, số trái, chiều cao, đường kính thân, lần cập nhật cuối + người cập nhật.

Action: **Cập nhật tình trạng** (primary, sticky đáy màn hình trên mobile, chỉ hiện với `manager`/`worker`), Xem lịch sử, Xem QR.

Mã không tồn tại → trang 404 riêng cho cây: "Không tìm thấy cây mã XYZ" + nút quét lại + về danh sách.

### 6.5. `/tree/:code/history`
Timeline mới → cũ. Mỗi bản ghi: thời gian, loại hoạt động (icon + nhãn), mô tả, người thực hiện, liều lượng, ảnh, số đo. Lọc theo loại. Empty state khi cây mới tạo.

### 6.6. Form cập nhật tình trạng (`features/updates`)
Modal trên desktop, **full-screen Drawer trên mobile**.

Nội dung trong 1 form (không wizard): trạng thái → tag bộ phận (chọn nhiều: `leaf/stem/branch/flower/fruit/pest/soil/other`) → mô tả → ảnh → 4 số đo → hành động đã làm → ghi chú.

Bắt buộc:
- `react-hook-form` + schema `zod`. Mô tả **required**, không tự điền câu mặc định.
- Số đo chặn âm và giá trị vô lý: chiều cao 0–30m, đường kính thân 0–200cm, ẩm đất 0–100%, số trái 0–500.
- Error hiển thị **ngay tại field**, kèm `aria-invalid` + `aria-describedby`.
- Disable nút submit khi đang submit → chặn double-submit.
- Không mất dữ liệu: đóng modal khi form dirty → `ConfirmDialog`.
- Ảnh: `PhotoUploader` upload qua service trả URL. **Không dùng `URL.createObjectURL` làm dữ liệu lưu** (mất khi reload) — chỉ để preview.
- Thành công: toast + đóng modal + invalidate query cây. Thất bại: giữ nguyên form + báo lỗi rõ nguyên nhân + nút thử lại.

### 6.7. `/map` Bản đồ vườn (MVP: chỉ xem)
- **SVG thuần** — chưa cần Konva/Fabric vì MVP chỉ render.
- Layer bật/tắt: ranh giới thửa, liếp, mương, đường nội bộ, hồ nước, tiện ích, cây.
- Click cây → panel thông tin nhanh → link sang passport.
- Zoom/pan bằng `viewBox`; pinch-zoom trên mobile.
- **Legend bắt buộc** (màu + hình dạng ↔ trạng thái).

**Hệ tọa độ — chốt hybrid (mục 9.1 tổng quan):** nguồn chuẩn là **lat/lng** lưu trên mỗi cây. FE quy đổi sang pixel để vẽ qua `utils/geo.ts`:

```ts
// utils/geo.ts — 2 hàm đối xứng, là NƠI DUY NHẤT biết phép quy đổi
latLngToXY(point: LatLng, anchors: MapAnchor[]): XY
xyToLatLng(point: XY, anchors: MapAnchor[]): LatLng
```

`anchors` = 2 điểm mốc biết cả lat/lng lẫn pixel trên ảnh nền; phép biến đổi tương tự (scale + tịnh tiến) đủ cho vườn 2,8 ha. Giai đoạn 2 nâng lên affine 3 điểm khi cần xoay — **chỉ sửa trong file này**, không component nào biết.

Có sẵn 2 hàm đối xứng từ MVP thì kéo-thả ở giai đoạn 2 chỉ là gắn `onDrag` → `xyToLatLng` → gọi service.

### 6.8. `/qr` Quản lý QR (`manager`)
- Lưới thẻ QR mọi cây, tìm + lọc theo lô, chọn nhiều để in.
- Tạo cây mới: **mã do backend sinh**. FE không dùng `trees.length + 1` — trùng mã sau khi xóa.
- Sinh QR mức sửa lỗi **H** (thẻ ngoài vườn bị bẩn/mờ), 320px, màu `--color-primary` trên nền trắng. Xuất PNG + SVG.
- **In: bắt buộc có `styles/print.css`** ẩn header/sidebar/nav, grid thẻ chia trang bằng `break-inside: avoid`. Không cần `jspdf`.

### 6.9. Quét QR (`features/qr/Scanner`)
- `getUserMedia({ facingMode: 'environment' })` + `BarcodeDetector` giải mã thật.
- iOS Safari (chưa có `BarcodeDetector`) → lazy import `zxing-wasm` **chỉ khi cần**.
- Từ chối quyền camera → hướng dẫn bật quyền + ô **nhập mã cây thủ công** (fallback bắt buộc: vườn sóng yếu, máy cũ).
- Quét ra mã không tồn tại → báo rõ mã đó + cho quét lại.

### 6.10. `/activity` Nhật ký vườn
Gộp history mọi cây thành feed, lọc theo loại + tìm kiếm, click nhảy về cây. **Sort bằng timestamp ISO**, không sort bằng `id`.

### 6.11. `/settings` (`manager`)
Tên vườn, kỹ thuật viên trưởng ca, mốc trắc địa trung tâm (dán link Google Maps / thập phân / DMS), điểm neo ảnh nền. **Phải lưu thật qua service** — không được chỉ hiện toast giả. Không có mục "chế độ xem công khai".

---

## 7. STATE MANAGEMENT

| Loại state | Giải pháp | Ví dụ |
|---|---|---|
| Local UI | `useState` trong component | modal open, tab active, layer map |
| URL state | `useSearchParams` | filter, search, page — để share/back được |
| Form | `react-hook-form` | form cập nhật, tạo cây |
| Server | **TanStack Query** | danh sách cây, chi tiết cây, history |
| Global | `AuthContext` (**duy nhất**) | user, role, token |

Query key chuẩn hóa ở `services/query-keys.ts`:

```ts
treeKeys.all, treeKeys.list(filters), treeKeys.detail(code), treeKeys.history(code)
```

Sau mutation → `invalidateQueries` theo key, **không** tự set state thủ công.

Cấm đẩy dữ liệu server vào Context/global store.

---

## 8. UX STATES — BẮT BUỘC ĐỦ 7 TRẠNG THÁI

Không màn hình nào chỉ có happy path. Dùng `<StateBoundary>` bọc mọi vùng dữ liệu async:

```tsx
<StateBoundary
  isLoading={isLoading} error={error} isEmpty={!data?.length}
  skeleton={<TreeListSkeleton />}
  empty={<EmptyState title="Chưa có cây nào" description="..." action={...} />}
>
  {children}
</StateBoundary>
```

| Trạng thái | Yêu cầu |
|---|---|
| Loading | **Skeleton** đúng hình dạng nội dung. Cấm màn hình trắng, cấm spinner toàn trang (trừ lần load app đầu) |
| Empty | Icon + tiêu đề + mô tả lý do + action tiếp theo. Phân biệt *chưa có dữ liệu* vs *bộ lọc không khớp* |
| Error | Nói **chuyện gì xảy ra** + **làm gì tiếp** + nút **Thử lại**. Cấm chữ "Error" trần |
| Success | Toast ngắn, tự tắt 3s, đóng tay được |
| Disabled | Có lý do (tooltip) khi không hiển nhiên |
| Submitting | Nút loading + disable, không khóa cả trang |
| Partial data | Field thiếu hiện "—" `text-muted`, không hiện `undefined`/`NaN`/`Invalid Date` |

**Mạng vườn yếu là mặc định, không phải ngoại lệ:** mọi mutation phải có retry thủ công rõ ràng; timeout 15s kèm thông báo tử tế.

---

## 9. RESPONSIVE

Mobile-first. Viết base style cho mobile, dùng `sm: md: lg: xl:` để mở rộng. **Không** làm desktop rồi vá media query.

| Thành phần | < md (mobile) | md–lg (tablet) | ≥ lg (desktop) |
|---|---|---|---|
| Sidebar | Drawer trượt | Drawer | Cố định 256px |
| Điều hướng chính | BottomNav 5 mục | Header + Drawer | Sidebar |
| Table | Card list | Scroll ngang trong khung | Table đầy đủ |
| Form/Modal | Full-screen Drawer | Modal `md` | Modal `md` |
| Grid cây | 1 cột | 2–3 cột | 4 cột |
| Map | Full width, pinch-zoom, panel = bottom sheet | Panel bên | Panel bên cố định |
| Toolbar/filter | Nút "Bộ lọc" → Drawer | Inline | Inline |
| Primary action | Sticky đáy màn hình | Trong PageHeader | Trong PageHeader |

Cấm scroll ngang toàn trang. Touch target tối thiểu **44×44px** (thao tác ngoài nắng, tay bẩn, đeo găng).

---

## 10. ACCESSIBILITY & ICONS

Bắt buộc, không phải "nice to have":

- Semantic HTML: `<button>` cho hành động, `<a>` cho điều hướng, `<nav> <main> <header>`, heading đúng cấp (1 `<h1>`/page).
- `focus-visible` thấy rõ: `outline: 2px solid var(--color-focus-ring); outline-offset: 2px`. Cấm `outline: none` không kèm thay thế.
- Mọi input có `<label>` gắn `htmlFor`. Placeholder **không** thay label.
- Modal/Drawer: focus trap, `Esc` đóng, trả focus về trigger, `role="dialog"` + `aria-modal` + `aria-labelledby`.
- Contrast ≥ 4.5:1 cho text thường, ≥ 3:1 cho text lớn và viền control.
- Màu không phải tín hiệu duy nhất (badge có icon, map có legend + hình dạng).
- Bàn phím chạy được toàn bộ luồng: login → danh sách → passport → cập nhật.
- Ảnh có `alt` mô tả; ảnh trang trí `alt=""`.

**Icons:** chỉ `lucide-react`, không trộn bộ icon khác. Size chuẩn: 16 (inline text) / 20 (button, list) / 24 (page header, empty state). Icon-only button bắt buộc `aria-label` + `Tooltip`. Icon không thay text khi hành động không hiển nhiên.

---

## 11. INTERACTION & MOTION

Feedback bắt buộc: `hover / focus / active / disabled / loading / success / error`.

Animation chỉ dùng cho: modal/drawer vào-ra, toast, skeleton shimmer, accordion, tooltip. Dùng `--transition-fast` (hover/color) hoặc `--transition-base` (layout). Chỉ animate `transform` và `opacity`.

Cấm: animation > 320ms trên thao tác thường xuyên, hiệu ứng ăn mừng chặn luồng làm việc (confetti sau mỗi lần cập nhật — nhân công cập nhật hàng chục cây/ngày), parallax, animation lặp vô hạn ngoài loading.

---

## 12. DỮ LIỆU & TYPE

`src/types/` là nguồn chuẩn duy nhất. Không khai báo shape dữ liệu trong component.

```ts
type TreeStatus   = 'healthy' | 'monitoring' | 'problem' | 'unknown';
type ActivityType = 'health_check' | 'watering' | 'fertilizing' | 'spraying'
                  | 'pruning' | 'treatment' | 'harvest';
type PartTag      = 'leaf' | 'stem' | 'branch' | 'flower' | 'fruit' | 'pest' | 'soil' | 'other';
type UserRole     = 'manager' | 'worker' | 'viewer';
```

**Quy tắc timestamp: mọi mốc thời gian lưu 1 trường ISO 8601 duy nhất (`recordedAt: string`).** Cấm tách `date` + `time` thành 2 chuỗi `dd/mm/yyyy` + `HH:mm` — sort sai và không timezone-safe. Format hiển thị **chỉ** qua `utils/date.ts` (`formatDate`, `formatDateTime`, `formatRelative`), không gọi `toLocaleDateString` rải rác.

**`healthScore` do backend tính** (`04_API.md` §2). FE chỉ hiển thị; mock dùng cùng công thức để khi nối API không lệch.

Mọi type có `farmId` từ đầu dù MVP chỉ 1 vườn.

---

## 13. TẦNG SERVICE

```ts
// services/trees.service.ts — component KHÔNG BIẾT dữ liệu đến từ mock hay API
export const treesService = {
  list:      (f?: TreeFilters)          => Promise<Tree[]>,
  detail:    (code: string)             => Promise<Tree>,
  history:   (code: string)             => Promise<HistoryRecord[]>,
  create:    (input: CreateTreeInput)   => Promise<Tree>,
  addUpdate: (code: string, input: UpdateInput) => Promise<HistoryRecord>,
};
```

Mock implementation: đọc `services/mock/trees.seed.ts`, `await delay(300–800ms)`, và **ném lỗi ngẫu nhiên khi `VITE_MOCK_ERRORS=1`** để test được error state thật.

Đổi sang API: chỉ sửa thân hàm trong `*.service.ts`, giữ nguyên signature + type. Không component/hook nào phải sửa.

`services/http.ts`: base URL từ `import.meta.env.VITE_API_URL`, gắn token, chuẩn hóa lỗi về `AppError { code, message, retryable }` để UI hiển thị thông điệp tiếng Việt tử tế.

---

## 14. CODE QUALITY

- TypeScript `strict: true`. **Cấm `any`** — không rõ type thì `unknown` + narrow.
- ESLint + Prettier chạy trong CI. Bật `eslint-plugin-jsx-a11y`.
- Component ≤ 200 dòng, hàm ≤ 50 dòng. Vượt → tách.
- Đặt tên: component `PascalCase`, hook `useXxx`, file trùng tên component.
- Không tạo abstraction khi pattern **chưa xuất hiện lần thứ 2**.
- Không interface cho 1 implementation, không factory cho 1 sản phẩm, không config cho giá trị không bao giờ đổi.
- Sửa shared component → kiểm tra mọi nơi đang dùng trước khi merge.
- Copy-paste khối JSX lần thứ 2 → dừng, tách component.

---

## 15. PERFORMANCE

- `lazy()` + `Suspense` theo route. Scanner và `zxing-wasm` lazy **chỉ khi mở**.
- 250 cây: client-side filter + pagination là đủ. **Không** virtualize sớm.
- Map SVG: `React.memo` cho node cây; không re-render cả map khi hover 1 cây.
- Ảnh: `loading="lazy"`, `width`/`height` cố định chống layout shift, thumbnail cho list — ảnh gốc chỉ ở gallery.
- `useMemo`/`useCallback` **chỉ khi đo được vấn đề**, không rắc khắp nơi.
- Budget: bundle ban đầu < 250KB gzip.

---

## 16. ERROR PREVENTION

- Optional chaining + default value cho mọi field có thể thiếu. Không render `undefined`/`NaN`/`Invalid Date`.
- `ErrorBoundary` ở 2 cấp: root app và mỗi route — 1 màn hình hỏng không làm trắng cả app.
- Mảng luôn `?? []` trước khi `.map`.
- Không tin response đúng shape — validate bằng `zod` ở `services/`.
- Chặn chia cho 0; `Math.max/min` khi tính phần trăm điểm sức khỏe.
- Ảnh lỗi → `onError` thay bằng placeholder.

---

## 17. THỨ TỰ IMPLEMENT

Làm đúng thứ tự, **không nhảy sang page trước khi xong Design System**:

| # | Việc | Xong khi |
|---|---|---|
| 1 | Scaffold Vite + TS strict + Tailwind v4 + ESLint/Prettier | `npm run build` sạch |
| 2 | `styles/index.css` với toàn bộ token mục 3.2 | Đổi `--color-primary` → cả app đổi màu |
| 3 | `types/` + `constants/` | Type khớp mục 12 |
| 4 | `components/ui/` đầy đủ | Có trang `/dev/ui` liệt kê mọi variant × state |
| 5 | `components/layout/` + `AppLayout` responsive | Chạy đúng ở 375 / 768 / 1440px |
| 6 | `services/` + mock + TanStack Query setup | Query trả data, có delay, bật được lỗi giả |
| 7 | Auth: login + AuthContext + guard + `useCan` + 403 | Luồng `/tree/X` → login → về đúng `/tree/X` |
| 8 | `/tree/:code` Passport + `/tree/:code/history` | Đủ 7 UX state |
| 9 | Form cập nhật tình trạng | Validate + chặn double-submit + không mất dữ liệu |
| 10 | `/trees` + `/` Dashboard | Filter đồng bộ URL |
| 11 | `/qr` sinh/in + Scanner giải mã thật | Quét QR in ra bằng điện thoại thật mở đúng cây |
| 12 | `/map` + `utils/geo.ts` | Vị trí cây khớp bản vẽ thực |
| 13 | `/activity` + `/settings` | Settings lưu thật |
| 14 | Pass checklist mục 18 | — |

Bước 11 là **tiêu chí nghiệm thu MVP**: in QR ra giấy, dán lên cây, quét bằng điện thoại thật ngoài vườn, đăng nhập, cập nhật được tình trạng.

---

## 18. SELF-REVIEW TRƯỚC KHI BÁO HOÀN THÀNH

**Design System**
- [ ] Không còn mã màu hex nào trong `src/features` và `src/components`
- [ ] Không có `px` tùy tiện ngoài `styles/` và `utils/geo.ts`
- [ ] Không có component trùng chức năng (biến thể `*Button*`, `*Card*`)
- [ ] Cùng một pattern (badge trạng thái, empty state, modal) chỉ có 1 implementation

**UX**
- [ ] Mọi vùng async có đủ loading / empty / error / success
- [ ] Không màn hình trắng khi đang tải
- [ ] Mọi error nói được "làm gì tiếp theo"
- [ ] Mỗi page có đúng 1 primary action nổi bật
- [ ] Form không mất dữ liệu, không double-submit được

**Responsive**
- [ ] Test thật ở 375 / 768 / 1024 / 1440px
- [ ] Không scroll ngang toàn trang
- [ ] Touch target ≥ 44px
- [ ] Table không phá layout mobile

**Accessibility**
- [ ] Tab qua được luồng login → passport → cập nhật
- [ ] Focus ring thấy rõ ở mọi control
- [ ] Mọi input có label, mọi icon-button có `aria-label`
- [ ] Modal có focus trap + Esc
- [ ] Contrast pass (kiểm bằng DevTools)

**Code**
- [ ] Không `any`
- [ ] Không component > 200 dòng
- [ ] Không fetch trực tiếp ngoài `services/`
- [ ] Không feature import chéo feature
- [ ] Không business logic trong `components/ui/`

**Performance**
- [ ] Route lazy load
- [ ] Bundle đầu < 250KB gzip
- [ ] Map không re-render toàn bộ khi hover

---

## 19. BÁO CÁO SAU KHI IMPLEMENT

Kết thúc, báo cáo ngắn gọn 7 mục:
1. Frontend architecture — 2. Design System đã tạo — 3. Reusable components — 4. Pages/features đã implement — 5. Quyết định UX quan trọng — 6. Điểm mở rộng tương lai — 7. Vấn đề/giả định còn tồn tại.

---

## 20. ĐIỂM MỞ RỘNG ĐÃ CHUẨN BỊ SẴN

| Sẽ thêm | Đã chuẩn bị ở MVP | Phải sửa gì |
|---|---|---|
| Kéo-thả cây trên map | `utils/geo.ts` có 2 hàm đối xứng, cây lưu lat/lng | Gắn `onDrag` + service update vị trí |
| API thật | Mọi data qua `services/` trả Promise | Thân hàm service |
| Dark theme | Token là CSS variable | Thêm block override token |
| Multi-farm | Type đã có `farmId` | Thêm farm selector ở Header |
| Role mới | `useCan()` tập trung | `constants/roles.ts` |
| PWA offline | Mutation đi qua 1 tầng service duy nhất | Thêm queue + service worker |
| App React Native | Service + type tách khỏi UI | Tái dùng `types/` + logic |

---

## 21. GIẢ ĐỊNH CÒN TỒN TẠI (chốt khi có BE)

1. **Backend chưa tồn tại** — mock theo contract `04_API.md`; `services/` là lớp đệm khi API lệch.
2. **Ảnh nền vườn**: cần file ảnh vệ tinh + lat/lng của 2 điểm mốc trên ảnh để `utils/geo.ts` neo đúng. Chưa có → tạm vẽ SVG không ảnh nền.
3. **Công thức `healthScore`** tạm theo prototype (healthy +5 kẹp 88–100; monitoring kẹp 70–84; problem −15 kẹp 45–65) — heuristic demo, BE chốt lại khi có tiêu chí VietGAP thật (`04_API.md` §2).
4. **Ngưỡng "chưa cập nhật lâu ngày"** tạm 14 ngày — để trong `constants/`, dễ đổi.
5. **Dữ liệu 250 cây thật** chưa có; mock seed 30 cây đủ test mọi trạng thái.
