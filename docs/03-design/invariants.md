# Bất biến chịu lực

> **Trả lời:** Sửa gì thì hệ thống sai **âm thầm** — test vẫn xanh mà kết quả vẫn sai?
> **Trạng thái:** 🟡 mặc định đề xuất, chưa rà theo dự án
> **Cập nhật:** — · commit —
> **Cập nhật khi:** phát hiện một bất biến mới — thường là ngay sau khi ai đó vừa phá nó

<!-- CÁCH ĐIỀN
ĐỌC FILE NÀY TRƯỚC KHI SỬA BẤT KỲ DÒNG CODE NÀO.

Bất biến ở đây KHÁC quy ước code. Quy ước format/naming thì ESLint bắt được; bất
biến thì không có công cụ nào bắt, và vi phạm nó thì code vẫn chạy, test vẫn xanh,
chỉ có kết quả là sai.

VIỆC CỦA BẠN: xoá dòng không áp dụng, thêm bất biến riêng của dự án, đổi sang 🟢.

GIỮ FILE NÀY < 40 DÒNG NỘI DUNG. Nó được đọc mỗi lần sửa code; dài ra là không ai
đọc nữa. Thứ gì không thuộc loại "sai âm thầm" thì bỏ ra khỏi đây.

KHÔNG chứa: quy ước format/naming (-> lint config), kiến trúc (-> architecture.md).
-->

| # | Bất biến | Vi phạm thì sao |
| --- | --- | --- |
| 1 | Thời gian lưu ở **UTC**. Đổi múi giờ chỉ xảy ra ở tầng hiển thị | Lệch một ngày ở biên múi giờ. Test viết theo giờ máy vẫn xanh |
| 2 | Mọi mutation kiểm quyền ở **server**, kể cả khi UI đã ẩn nút | Người dùng gọi API trực tiếp và sửa được dữ liệu của người khác |
| 3 | Chỉ tầng service truy vấn datastore. Route/handler không query trực tiếp | Bỏ qua lớp kiểm quyền và validate nằm trong service |
| 4 | Tiền và số cần chính xác **không dùng float** | Sai số tích luỹ, không tái tạo được, phát hiện sau nhiều tháng |
| 5 | Bản ghi đang được tham chiếu thì **soft-delete**, không hard-delete | Dữ liệu tham chiếu mồ côi, báo cáo cũ thiếu dòng |
| 6 | Tác vụ ghi quan trọng phải **idempotent** theo một khoá | Retry hoặc double-click tạo bản ghi trùng |
| 7 | Migration **chỉ tiến**. Không sửa migration đã chạy ở bất kỳ môi trường nào | Lịch sử schema giữa các môi trường lệch nhau, không hoà giải được |
| 8 | Thứ tự middleware: **auth → validate → handler** | Handler nhận dữ liệu chưa validate, hoặc validate chạy khi chưa biết người gọi |
| 9 | Không tin `id` gửi từ client để xác định quyền sở hữu. Luôn đối chiếu với session | Truy cập chéo dữ liệu giữa các người dùng |
| 10 | <!-- TODO: bất biến riêng của dự án này --> | |
