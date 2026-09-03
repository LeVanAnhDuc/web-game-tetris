# ADR-0010 · `reduce` sửa state tại chỗ, không copy

> **Ngày:** 2026-09-03
> **Trạng thái:** accepted
> **Liên quan:** NFR-PERF-01 · NFR-PERF-03 · ADR-0002 · ADR-0003

## 1. Bối cảnh

ADR-0002 nói `engine/` là hàm thuần: `reduce(state, commands)`. Cách đọc tự nhiên của
"hàm thuần" là **không sửa đầu vào** — trả về một state mới. Nhưng state chứa một
`Uint8Array(400)` cho board, và vòng lặp gọi `reduce` **60 lần mỗi giây**. Copy state
mỗi tick nghĩa là 60 lần cấp phát 400 byte cộng một object state mỗi giây, tức đúng
cái mà `NFR-PERF-03` cấm: "không cấp phát trên hot path; `reduce` không sinh
object/array mới trên đường đi thường". Hai điều tôi tự viết ra đang đánh nhau.

## 2. Quyết định

`reduce(s, cmds)` **sửa `s` tại chỗ** và trả về chính `s`. Board là cùng một
`Uint8Array` suốt một lượt chơi. Không có state cũ nào tồn tại sau khi `reduce` chạy.

Tính chất mà ADR-0002 thực sự cần vẫn được giữ **nguyên vẹn**, vì nó không phải tính
bất biến của dữ liệu mà là: **không đọc đồng hồ, không đọc randomness ngoài, không
chạm DOM, cùng đầu vào cho cùng đầu ra**. `reduce` vẫn deterministic, vẫn test được
bằng cách dựng state rồi assert, và replay vẫn tái tạo được bit-for-bit.

`events` là ngoại lệ duy nhất được phép cấp phát, và chỉ khi có event thật — đường đi
thường trả về một array rỗng **đóng băng dùng chung**, không tạo mới.

## 3. Phương án đã loại

| Phương án | Vì sao loại |
| --- | --- |
| Copy state mỗi tick (bất biến thật) | 60 lần cấp phát 400-byte board mỗi giây trên hot path. Vi phạm trực tiếp `NFR-PERF-03`, và sawtooth GC là thứ chỉ lộ trên máy yếu |
| Immutable với structural sharing (Immer / persistent vector) | Board là mảng phẳng được ghi ngẫu nhiên từng ô — đúng dạng dữ liệu mà structural sharing không giúp gì, chỉ thêm một lớp gián tiếp trên hot path |
| Double buffer: hai state, `reduce` đọc A ghi B, đổi vai mỗi tick | Không cấp phát, và giữ được một snapshot của tick trước. Nhưng phải copy A sang B mỗi tick (vẫn 400 byte) và tăng gấp đôi bộ nhớ, để đổi lấy một snapshot mà không ai cần |
| Chỉ copy phần "nhẹ" của state, share board | Nửa vời: người đọc code không biết field nào an toàn để giữ tham chiếu. Một quy tắc rõ ràng ("không giữ state cũ") tốt hơn một quy tắc có ngoại lệ |

## 4. Hệ quả

**Được:**
- Không cấp phát trên hot path, đúng `NFR-PERF-03`.
- Một `Uint8Array` cho một lượt chơi, không phụ thuộc GC.
- Test và replay không mất gì: determinism là tính chất được giữ, không phải
  immutability.

**Mất / phải chấp nhận:**
- **`reduce` không còn "thuần" theo nghĩa thông thường.** Người đọc code thấy tên
  `reduce` sẽ mong nó trả về state mới. Đây là lý do ADR này tồn tại, và là lý do
  `design.md` §4 nói thẳng điều đó cho người viết test.
- Không thể so `stateTruoc !== stateSau` trong test. Muốn so trước/sau thì phải chụp
  **giá trị**, không chụp object.
- Không có time-travel debugging miễn phí. Thay thế là replay: seed + chuỗi command
  tái tạo được bất kỳ tick nào (FR-18) — chậm hơn nhưng không tốn gì lúc chạy.
- Nếu về sau `ui/` cần một snapshot để render bất đồng bộ, nó phải tự copy phần nó
  cần, và đó là chỗ dễ quên.

**Điều kiện xem lại quyết định này:** nếu đo thấy copy state mỗi tick **không** ảnh
hưởng ngân sách frame trên máy mục tiêu — lúc đó bất biến thật rẻ hơn một ADR.
