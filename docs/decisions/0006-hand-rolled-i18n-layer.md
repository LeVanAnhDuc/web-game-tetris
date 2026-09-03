# ADR-0006 · Tự viết lớp i18n mỏng thay vì dùng thư viện

> **Ngày:** 2026-09-03
> **Trạng thái:** accepted
> **Liên quan:** FR-28 · NFR-I18N-01 · NFR-I18N-03 · NFR-I18N-04 · NFR-PERF-04

## 1. Bối cảnh

Giao diện song ngữ `en`/`vi` ngay từ bản đầu, có nút đổi ngôn ngữ và lưu vào thiết
lập. Nhưng tổng số chuỗi hiển thị của cả game rất nhỏ — ba màn hình, một HUD, một
form. Phần lớn thuật ngữ Tetris (`T-Spin`, `Back-to-Back`, `DAS`, `ARR`, `PPS`) **không
dịch** ở cả hai locale. Không có số nhiều phức tạp, không có nội dung do người dùng
tạo, không cần tải locale theo route.

## 2. Quyết định

Tự viết: hai file JSON phẳng (`en.json`, `vi.json`), một React context giữ locale
hiện tại, một hàm `t(key, params?)` nội suy tham số đơn giản. Locale mặc định đoán từ
`navigator.language` ở lần đầu, sau đó đọc từ `SettingsRepository`. Định dạng số và
ngày dùng `Intl.NumberFormat`/`Intl.DateTimeFormat` sẵn có của browser, theo locale
đang chọn chứ không theo locale máy (NFR-I18N-03). Một test so sánh **tập key của hai
file phải bằng nhau** (NFR-I18N-04).

## 3. Phương án đã loại

| Phương án | Vì sao loại |
| --- | --- |
| `react-i18next` / `i18next` | Mang theo plural rules, interpolation nâng cao, backend loader, namespace — không dùng cái nào, mà vẫn tính vào NFR-PERF-04 |
| `react-intl` (FormatJS) | Cùng lý do, cộng thêm một bước biên dịch message |
| Không i18n, hardcode tiếng Anh | Đã bị loại ở bước brainstorm: yêu cầu là song ngữ ngay từ đầu |
| Lớp `t()` mỏng nhưng chỉ một locale, thêm `vi` sau | Chuỗi tiếng Việt sẽ được viết thẳng vào JSX ở đâu đó và không ai tìm lại được. NFR-I18N-01 chỉ `grep` được khi cả hai locale tồn tại từ đầu |

## 4. Hệ quả

**Được:**
- Không thêm dependency runtime nào cho i18n.
- Thiếu key là test fail, không phải là một chuỗi lạ hiện trên UI khi có người dùng thật.
- Đổi ngôn ngữ không cần tải lại trang vì cả hai locale đã nằm trong bundle.

**Mất / phải chấp nhận:**
- Không có plural rules. Nếu về sau cần "1 hàng / 2 hàng" theo quy tắc số nhiều của
  một ngôn ngữ khác thì phải tự viết hoặc đổi sang thư viện.
- Cả hai locale nằm trong bundle chính — chấp nhận được ở kích thước này, sẽ thành
  vấn đề nếu số locale tăng.
- Lớp tự viết là code của mình phải tự bảo trì, kể cả phần nội suy tham số.

**Điều kiện xem lại quyết định này:** thêm locale thứ ba, hoặc xuất hiện nhu cầu số
nhiều / giới tính / định dạng phụ thuộc ngữ pháp.
