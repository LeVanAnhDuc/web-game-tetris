# Yêu cầu phi chức năng

> **Trả lời:** Ngưỡng nào áp cho **mọi** feature, để không phải nhắc lại từng lần?
> **Trạng thái:** 🟡 mặc định đề xuất, chưa rà theo dự án
> **Cập nhật:** — · commit —
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

## Performance

| ID | Ngưỡng | Cách kiểm |
| --- | --- | --- |
| NFR-PERF-01 | Mọi endpoint trả danh sách đều phân trang. Mặc định 20, tối đa 100 | review code |
| NFR-PERF-02 | p95 < 300ms cho endpoint đọc, < 800ms cho endpoint ghi (không tính tác vụ nền) | đo trên môi trường gần production |
| NFR-PERF-03 | Không có truy vấn N+1 trên đường đi chính | bật log query rồi đi qua luồng chính |
| NFR-PERF-04 | Mọi cột dùng để filter hoặc sort đều có index | review migration |

## Security

| ID | Ngưỡng | Cách kiểm |
| --- | --- | --- |
| NFR-SEC-01 | Mọi mutation kiểm quyền ở **server**. Không tin bất kỳ dữ liệu nào từ client | test cho từng endpoint |
| NFR-SEC-02 | Không log PII, token, mật khẩu, hay nội dung request body có dữ liệu người dùng | review format log |
| NFR-SEC-03 | Rate limit endpoint đăng nhập / đăng ký / quên mật khẩu: 10 req/phút/IP | test |
| NFR-SEC-04 | Secret chỉ đọc từ biến môi trường. Không hardcode, không commit | grep + review |
| NFR-SEC-05 | Dependency không có lỗ hổng mức high trở lên | lệnh audit của toolchain, chạy trong CI |
| NFR-SEC-06 | Lỗi trả về client không chứa stack trace, tên bảng, hay câu SQL | test |

## Accessibility

| ID | Ngưỡng | Cách kiểm |
| --- | --- | --- |
| NFR-A11Y-01 | Tương phản chữ thường ≥ 4.5:1, chữ lớn ≥ 3:1 | devtools |
| NFR-A11Y-02 | Mọi hành động thao tác được bằng bàn phím, và focus luôn thấy được | thử tay |
| NFR-A11Y-03 | Vùng bấm ≥ 44×44px trên thiết bị cảm ứng | review mockup |
| NFR-A11Y-04 | Mọi input có label liên kết; thông báo lỗi đọc được bởi screen reader | review |
| NFR-A11Y-05 | Tôn trọng `prefers-reduced-motion` | review CSS |

## i18n

| ID | Ngưỡng | Cách kiểm |
| --- | --- | --- |
| NFR-I18N-01 | Không hardcode chuỗi hiển thị trong code | grep |
| NFR-I18N-02 | Thời gian lưu ở UTC; đổi múi giờ chỉ xảy ra ở tầng hiển thị | test |
| NFR-I18N-03 | Định dạng số, tiền, ngày theo locale của người dùng | review |

## Reliability

| ID | Ngưỡng | Cách kiểm |
| --- | --- | --- |
| NFR-REL-01 | Mọi lệnh gọi ra ngoài có timeout và có nhánh xử lý lỗi | review |
| NFR-REL-02 | Tác vụ ghi quan trọng là idempotent — retry không tạo bản ghi trùng | test |
| NFR-REL-03 | Không có trạng thái loading vô hạn: mọi request đều có nhánh lỗi trên UI | thử tay |

## Data & Privacy

| ID | Ngưỡng | Cách kiểm |
| --- | --- | --- |
| NFR-DATA-01 | Trường nào là PII được liệt kê rõ ở bảng dưới | bảng dưới |
| NFR-DATA-02 | Xoá tài khoản thì xoá hoặc ẩn danh hoá toàn bộ PII của tài khoản đó | test |
| NFR-DATA-03 | Có đường khôi phục dữ liệu: backup, hoặc migration ngược đã thử thật | thử thật một lần |

**Trường PII trong dự án này:**

| Trường | Nằm ở | Giữ bao lâu |
| --- | --- | --- |
| <!-- TODO --> | | |
