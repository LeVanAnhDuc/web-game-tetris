# Yêu cầu phi chức năng

> **Trả lời:** Ngưỡng nào áp cho **mọi** feature, để không phải nhắc lại từng lần?
> **Trạng thái:** 🟢 đủ
> **Cập nhật:** 2026-09-03 · commit 0010a0f
> **Cập nhật khi:** thêm loại tài nguyên mới · thêm nhóm người dùng · sau sự cố sinh ra ngưỡng mới

<!-- CÁCH ĐIỀN
Đây là file AI BỎ QUA ÂM THẦM nếu nó trống — code vẫn chạy, test vẫn xanh, và
không có cảnh báo nào. Vì vậy nó được điền sẵn bằng các ngưỡng mặc định hợp lý.

VIỆC CỦA BẠN: đọc một lượt, XOÁ dòng không áp dụng, SỬA con số cho khớp dự án,
rồi đổi trạng thái sang 🟢. Giữ nguyên nguyên văn mặc định cũng được, nhưng phải
là lựa chọn có ý thức.

Mỗi dòng phải ĐO ĐƯỢC. Không viết được cách kiểm thì chưa phải yêu cầu:
  Sai:  "API phải nhanh"      Đúng: "p95 < 300ms cho endpoint đọc"
  Sai:  "phải bảo mật"        Đúng: "mọi mutation kiểm quyền ở server"

ID không tái dùng. Bỏ một ngưỡng thì đổi thành ~~(bỏ)~~, không xoá dòng.
Tài liệu thiết kế của feature tham chiếu ID ở dòng `Liên quan:` — KHÔNG chép nội dung sang.
-->

<!-- LỊCH SỬ: bộ ngưỡng mặc định của scaffold hướng backend (phân trang, N+1, index,
     migration, PII, rate limit đăng nhập) đã được XOÁ và cấp số lại vào 2026-09-03,
     theo đúng chỉ dẫn "XOÁ dòng không áp dụng" ở trên. Việc xoá thay vì gạch ~~(bỏ)~~
     là an toàn vì `grep -rn "NFR-"` lúc đó cho thấy KHÔNG có ID nào trong file này
     được tham chiếu ở bất kỳ đâu — 5 chỗ khớp đều là ví dụ trong template và
     CLAUDE.md. Quy tắc "ID không tái dùng" có hiệu lực từ bộ ID dưới đây trở đi. -->

> **Về các con số:** những dòng có ngân sách (frame budget, bundle size, thời gian
> tải) là **ngưỡng tự chọn, chưa phải số đo**. Chúng sẽ được đối chiếu sau bản build
> đầu tiên và sửa lại nếu sai thực tế — không dòng nào ở đây đang khẳng định một
> phép đo đã diễn ra.

## Performance

| ID | Ngưỡng | Cách kiểm |
| --- | --- | --- |
| NFR-PERF-01 | 60fps liên tục ở **mọi** cấp độ. Ngân sách một frame (tick + draw) ≤ 8ms | Performance panel, chơi tới level 15 |
| NFR-PERF-02 | Độ trễ đầu vào ≤ 1 tick (16.7ms) từ `keydown` đến khi state đổi | test đơn vị trên loop + đo tay |
| NFR-PERF-03 | **Không cấp phát trên hot path.** `board` tái dùng cùng một `Uint8Array`; `reduce` không sinh object/array mới trên đường đi thường | heap snapshot: chơi 3 phút không thấy sawtooth GC |
| NFR-PERF-04 | Bundle sau gzip ≤ 200KB | báo cáo build của Vite |
| NFR-PERF-05 | Tải xong và chơi được trong ≤ 2s trên 3G mô phỏng | Lighthouse |

## Security

Không có backend, nên phần này nhỏ. Bốn ngưỡng backend của bản mặc định (kiểm quyền
ở server, không log PII, rate limit đăng nhập, lỗi không lộ stack trace) **không áp
dụng** — không có server để áp.

| ID | Ngưỡng | Cách kiểm |
| --- | --- | --- |
| NFR-SEC-01 | Secret chỉ đọc từ biến môi trường. Không hardcode, không commit | grep + review |
| NFR-SEC-02 | Dependency không có lỗ hổng mức high trở lên | `npm audit` trong CI |
| NFR-SEC-03 | Nickname do người chơi nhập **không** được đưa vào `innerHTML`; không dùng `eval` | grep + review |

## Accessibility

| ID | Ngưỡng | Cách kiểm |
| --- | --- | --- |
| NFR-A11Y-01 | Tương phản chữ thường ≥ 4.5:1, chữ lớn ≥ 3:1 | devtools |
| NFR-A11Y-02 | Mọi hành động thao tác được bằng bàn phím, và focus luôn thấy được | thử tay |
| NFR-A11Y-03 | Vùng bấm ≥ 44×44px trên thiết bị cảm ứng | review mockup |
| NFR-A11Y-04 | Mọi input có label liên kết; thông báo lỗi đọc được bởi screen reader | review |
| NFR-A11Y-05 | Tôn trọng `prefers-reduced-motion` | review CSS |
| NFR-A11Y-06 | **Màu không phải kênh thông tin duy nhất.** 7 loại khối phân biệt được khi bật chế độ không phụ thuộc màu (FR-26) | thử với bộ mô phỏng mù màu |

## i18n

| ID | Ngưỡng | Cách kiểm |
| --- | --- | --- |
| NFR-I18N-01 | Không hardcode chuỗi hiển thị. Mọi chuỗi đi qua `t()` | grep chuỗi chữ trong JSX |
| NFR-I18N-02 | Thời gian lưu ở UTC; đổi múi giờ chỉ xảy ra ở tầng hiển thị | test |
| NFR-I18N-03 | Định dạng số và ngày theo locale đang chọn, không theo locale máy | test với cả `en` và `vi` |
| NFR-I18N-04 | Hai file locale có **cùng tập key**. Thiếu hoặc thừa key thì test fail | test so sánh key |

## Reliability

| ID | Ngưỡng | Cách kiểm |
| --- | --- | --- |
| NFR-REL-01 | Tab mất focus thì **tự tạm dừng**. Gravity không chạy ngầm | thử tay |
| NFR-REL-02 | Dữ liệu `localStorage` hỏng hoặc không parse được → app vẫn khởi động với mặc định, **không crash** | test với dữ liệu rác cố ý |
| NFR-REL-03 | `localStorage` bị chặn hoặc hết quota → vẫn chơi được trọn vẹn, chỉ không lưu, và nói rõ cho người chơi | test với storage bị chặn |
| NFR-REL-04 | Vòng lặp cap 5 tick mỗi frame — tab bị treo lâu không làm game nhảy hàng loạt tick | test đơn vị trên loop |
| NFR-REL-05 | Không có trạng thái loading vô hạn: mọi tác vụ đọc/ghi storage đều có nhánh lỗi trên UI | thử tay |

## Data & Privacy

**⚪ Chưa áp dụng.** Toàn bộ dữ liệu của dự án — nickname, thiết lập, điểm cao,
replay — nằm trong `localStorage` **trên máy người dùng** và không được truyền đi
đâu. Không có server, không có analytics, không có cookie của bên thứ ba. Vì vậy
không có PII nào do dự án này lưu giữ.

Xem lại toàn bộ mục này khi cắm Ducker ID (ADR-0004) — lúc đó mới xuất hiện dữ liệu
rời khỏi máy người dùng, và ba ngưỡng mặc định đã xoá (liệt kê PII, xoá tài khoản
kéo theo xoá PII, đường khôi phục dữ liệu) sẽ phải được cấp ID mới.
