# ADR-0002 · Giữ engine luật chơi thuần khiết và deterministic

> **Ngày:** 2026-09-03
> **Trạng thái:** accepted
> **Liên quan:** FR-02 · FR-18 · FR-19 · NFR-PERF-03 · ADR-0005

## 1. Bối cảnh

Luật Tetris chuẩn Modern Guideline có nhiều chi tiết mà **chơi thử không kiểm được**:
bảng wall-kick SRS phải thử offset đúng thứ tự, T-spin phụ thuộc nước đi cuối cùng
và kick đã thành công, gravity theo cấp độ là một công thức. Đây là loại sai chỉ hiện
ra ở vài trường hợp hiếm. Cùng lúc đó, Non-Goals nói không có leaderboard server ở
bản này, nhưng ADR-0004 chừa đường cắm về sau — và một leaderboard tin con số client
gửi lên thì vô nghĩa.

## 2. Quyết định

`engine/` là TypeScript thuần: state là dữ liệu, `reduce(state, commands)` là hàm
thuần. Bên trong `engine/` **không** gọi `Date.now()`, `performance.now()`,
`Math.random()`, và không chạm DOM. Thời gian được biểu diễn bằng **tick nguyên**;
randomness đến từ một PRNG có seed được inject. Hệ quả trực tiếp: một lượt chơi được
mô tả trọn vẹn bởi `{ seed, commands: [{tick, command}] }`, nên **ghi replay ngay từ
bản đầu** (FR-18), dù chưa có UI xem lại.

## 3. Phương án đã loại

| Phương án | Vì sao loại |
| --- | --- |
| Engine đọc `performance.now()` trực tiếp | Test phải phụ thuộc đồng hồ thật hoặc phải mock, và replay không tái tạo được |
| Engine tiến theo `deltaTime` thay vì tick | Gravity phụ thuộc tần số quét màn hình — người màn 144Hz chơi game khác. Test không có màn hình nên vẫn xanh |
| `Math.random()` cho 7-bag | Không tái tạo được bug "khối kẹt ở cấp 12"; mỗi lần chạy lại là một chuỗi khác |
| Hoãn replay sang backlog | Determinism đã buộc phải có sẵn, nên ghi replay chỉ là lưu seed + chuỗi lệnh. Cắm vào sau đắt hơn làm ngay |

## 4. Hệ quả

**Được:**
- Bảng wall-kick, bảng điểm, T-spin trở thành test đối chiếu nguồn công khai.
- Một bug tái tạo được bằng file 2KB thay vì bằng lời kể.
- `engine/` chạy được trong Node, tức là server validate điểm bằng replay là khả thi
  về sau mà không viết lại luật lần hai.

**Mất / phải chấp nhận:**
- Mọi thứ liên quan thời gian phải quy về tick, kể cả lock delay và DAS/ARR — engine
  phình ra và tầng ngoài phải chuyển đổi qua lại.
- Phải kỷ luật: một lần gọi `Date.now()` lọt vào `engine/` là mất toàn bộ tính chất
  trên, và **không có test nào fail** khi điều đó xảy ra.

**Điều kiện xem lại quyết định này:** không có. Nếu bỏ quyết định này thì FR-18 và
đường validate điểm ở server mất theo, nên phải là một ADR mới nói rõ chấp nhận mất.
