# ADR-0008 · Chrome phi sắc, màu chỉ tồn tại trong bàn chơi

> **Ngày:** 2026-09-03
> **Trạng thái:** accepted
> **Liên quan:** FR-26 · NFR-A11Y-01 · NFR-A11Y-06 · ADR-0003

## 1. Bối cảnh

`design-bootstrap` chạy `ui-ux-pro-max --design-system` cho từ khoá tetris/arcade và
nhận về: style *Pixel Art*, chữ `Press Start 2P` + `VT323`, palette neon đỏ `#DC2626`
làm Primary/Ring/Destructive, xanh `#2563EB` làm Secondary, xanh lá `#22C55E` làm
Accent, kèm page pattern *Hero-Centric*. Đây là output catalog và skill nói rõ phải
coi nó là **input**.

Ràng buộc mà catalog không biết: 7 tetromino có **hue cố định theo convention**
(I cyan · J blue · L orange · O yellow · S green · T purple · Z red). Đỏ, xanh dương
và xanh lá mà bước 1 chọn cho chrome **chính là** màu của khối Z, J và S.

## 2. Quyết định

Toàn bộ chrome — HUD, menu, Settings, bảng, nút — là **phi sắc** (thang xám trên nền
`#0E0F13`). Bàn chơi là vùng bão hoà **duy nhất** trên màn hình. Focus ring màu trắng,
2px, **có `outline-offset: 2px`**. Chữ dùng `Space Grotesk` (UI) + `IBM Plex Mono`
(mọi con số thay đổi khi đang hiện). Danger tách thành hai token: `--color-danger`
`#E5484D` cho viền/đồ hoạ, `--color-danger-text` `#EB6E72` cho chữ. Một theme, chỉ tối.
Chi tiết và số đo trong `docs/design-system/tetris/MASTER.md`.

## 3. Phương án đã loại

| Phương án | Vì sao loại |
| --- | --- |
| Nguyên palette bước 1 (`#DC2626`/`#2563EB`/`#22C55E`) | Cả ba là hue tetromino. Focus ring đỏ cạnh khối Z đỏ không còn đọc được là focus; HUD và bàn chơi thành cùng một tín hiệu |
| `Press Start 2P` + `VT323` | Bitmap face, ở cỡ của màn Settings thì vỡ `NFR-A11Y-01`/`04`. Và 8-bit phát tín hiệu **NES Tetris** — đúng cảm giác "sai tay" mà `overview.md` §2 tồn tại để sửa |
| Giữ `#E5484D` làm màu chữ danger | Đo được **4.10:1** trên `--color-surface-raised`, tức mọi modal. Vỡ `NFR-A11Y-01` ở đúng chỗ chữ "Reset to defaults?" nằm |
| Chọn một accent bão hoà nhưng nằm ngoài 7 hue (magenta/teal) | Còn chỗ, nhưng vẫn cạnh tranh kênh màu với bàn chơi và làm hẹp không gian cho `FR-26` |
| Hai theme sáng/tối | Cần bộ 7 hue thứ hai và phải đo lại toàn bộ, cho một game một người ở phạm vi này |
| Page pattern *Hero-Centric* | Là phễu landing page marketing. Sản phẩm có 3 màn app, không có landing page |

## 4. Hệ quả

**Được:**
- Bàn chơi không bao giờ bị chrome cạnh tranh — cái người chơi cần nhìn là cái duy nhất có màu.
- `FR-26` khả thi: chrome phi sắc nên overlay ký tự/hoa văn trên khối có toàn bộ không gian thị giác.
- Mọi giá trị màu đều **đã đo**, ghi trong `MASTER.md` §2. Thêm màu mới là phải đo, không ước lượng.

**Mất / phải chấp nhận:**
- Không có màu thương hiệu. Giao diện sẽ bị mô tả là "khô" — đó là chủ ý, nhưng nó là
  một đánh đổi thật, không phải điều ai cũng thích.
- Nhấn mạnh phải làm bằng **cỡ chữ, độ đậm, khoảng trắng** thay vì màu, tốn công layout hơn.
- Đo được rằng 7 hue **không** phân biệt được lẫn nhau (T vs Z chỉ **1.20:1**), nên
  `FR-26` chuyển từ "nên có" thành **bắt buộc** — với người không phân biệt được T và Z
  thì đó là cùng một khối.

**Điều kiện xem lại quyết định này:** nếu sản phẩm cần bản sắc thương hiệu thật (nhiều
game trong một ecosystem), hoặc nếu người chơi thật cho biết chrome phi sắc gây khó
định hướng giữa các màn.
