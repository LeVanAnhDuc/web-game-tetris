# ADR-0005 · Tính DAS/ARR trong engine, không ở tầng input

> **Ngày:** 2026-09-03
> **Trạng thái:** accepted
> **Liên quan:** FR-15 · FR-16 · FR-18 · FR-24 · ADR-0002

## 1. Bối cảnh

Giữ phím sang trái thì khối phải đợi một khoảng (DAS) rồi tự chạy ngang theo một nhịp
(ARR). Hai giá trị này người chơi tự chỉnh được (FR-24) và là thứ quyết định "khớp
tay" — chúng nằm trong lý do tồn tại của sản phẩm. Câu hỏi là chỗ đếm thời gian:
tầng `input/` hay `engine/`. Cách tự nhiên là để `input/` dùng `setTimeout`/`setInterval`
sinh ra chuỗi lệnh repeat, vì nó đang nghe sự kiện bàn phím rồi.

## 2. Quyết định

`input/` chỉ phát `Command` kèm **press** hoặc **release**, không tự sinh lệnh repeat.
`engine/` giữ trạng thái phím đang giữ cùng `dasTimer`/`arrTimer` và tự phát sinh
bước di chuyển bên trong `reduce`, đếm bằng **tick**. `TouchInput` phát đúng cùng bộ
`Command` nên dùng lại toàn bộ logic này, chỉ khác ngưỡng cấu hình.

## 3. Phương án đã loại

| Phương án | Vì sao loại |
| --- | --- |
| `input/` dùng `setInterval` sinh lệnh repeat | Auto-repeat phụ thuộc timer của browser: bị throttle khi tab ẩn, không khớp nhịp tick, và **replay lệch dần** — mất tính chất của ADR-0002 |
| `runtime/` đếm DAS giữa `input/` và `engine/` | Tạo tầng thứ ba giữ state thời gian, trong khi `engine/` đã là nơi duy nhất được phép giữ state theo tick |
| Cố định DAS/ARR, không cho chỉnh | Đi ngược §2 của `overview.md` — DAS/ARR cố định là một trong những lý do người chơi thấy bản web "sai tay" |

## 4. Hệ quả

**Được:**
- Auto-repeat deterministic: cùng seed + cùng chuỗi press/release cho ra cùng kết quả.
- Keyboard và touch dùng chung một cơ chế; thêm gamepad về sau chỉ là thêm một file
  trong `input/`.
- DAS/ARR test được bằng unit test trên `reduce`, không cần browser.

**Mất / phải chấp nhận:**
- `engine/` phình thêm: nó phải biết khái niệm "phím đang giữ", vốn nghe như việc của
  tầng input.
- `input/` bắt buộc phải phát `release` chính xác. Bỏ sót một `keyup` (ví dụ khi tab
  mất focus giữa lúc đang giữ phím) thì engine tưởng phím còn giữ và khối chạy mãi —
  nên mất focus phải clear toàn bộ phím đang giữ.

**Điều kiện xem lại quyết định này:** nếu xuất hiện một nguồn input mà bản chất là
sự kiện rời rạc không có khái niệm giữ/nhả.
