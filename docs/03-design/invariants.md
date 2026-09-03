# Bất biến chịu lực

> **Trả lời:** Sửa gì thì hệ thống sai **âm thầm** — test vẫn xanh mà kết quả vẫn sai?
> **Trạng thái:** 🟢 đủ
> **Cập nhật:** 2026-09-03 · commit 0010a0f
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
| 1 | `engine/` **thuần khiết**: không `Date.now()`, không `performance.now()`, không `Math.random()`, không DOM. Thời gian và RNG được inject | Replay không tái tạo được, test flaky theo máy, và mất luôn đường validate điểm ở server về sau |
| 2 | Engine tiến theo **tick nguyên**, không theo `deltaTime` | Người màn 144Hz chơi game khác người màn 60Hz. Test không có màn hình nên vẫn xanh |
| 3 | React state **không** điều khiển vòng lặp mỗi frame. HUD nhận cập nhật ở nhịp thấp | Rớt frame vì GC, chỉ lộ trên máy yếu và chỉ ở cấp độ cao |
| 4 | DAS/ARR đếm **trong engine**; `input/` chỉ phát press/release | Auto-repeat phụ thuộc timer của browser, replay lệch dần theo thời gian |
| 5 | Wall kick: thử offset đúng thứ tự bảng SRS và lấy kết quả thành công **đầu tiên** | Phần lớn nước xoay vẫn đúng; chỉ vài kick đặc thù sai — chơi thử không phát hiện được |
| 6 | Một `bag` cho một lượt chơi. Không tạo lại giữa các khối | Phân phối trông đúng trong test ngắn, nhưng chuỗi khối dài bị sai |
| 7 | `lastMove` và `lastKickIndex` phải được cập nhật ở **mọi** nhánh của `reduce` | T-spin nhận sai, và luôn sai theo hướng có lợi cho người chơi |
| 8 | `moveResets` cap **15** | Người chơi stall vô hạn, lượt chơi không bao giờ kết thúc |
| 9 | Board là 10×**40**. Mọi kiểm tra biên dùng hằng `VISIBLE_ROWS`, không rải số `20` | Điều kiện block-out/lock-out sai ở biên trên đỉnh — chỗ khó phát hiện nhất |
| 10 | Mọi chuỗi hiển thị đi qua `t()`. Hai file locale cùng tập key | Đổi ngôn ngữ xong vẫn còn vài chỗ tiếng cũ; không ai thấy nếu chỉ test một locale |
| 11 | Thời điểm lưu ở **UTC**; đổi múi giờ chỉ ở tầng hiển thị | Ngày của điểm cao lệch một ngày ở biên múi giờ |
| 12 | `SettingsRepository` đọc dữ liệu cũ phải **migrate theo `schemaVersion`**, không ghi đè | Thiết lập của người chơi bị xoá sạch sau một lần deploy |
