# ADR-0012 · `render/` được giữ bộ nhớ thị giác

> **Ngày:** 2026-09-04
> **Trạng thái:** accepted
> **Liên quan:** FR-35 → FR-40 · NFR-PERF-03 · NFR-A11Y-05 · ADR-0003 · ADR-0010

## 1. Bối cảnh

`architecture.md` §3 ghi `render/` là "vẽ state lên canvas, **không giữ state riêng**".
Luật đó đúng khi renderer còn câm. Animation phá nó theo hai đường:

- Nội suy cần biết vị trí **trước đó**, mà `reduce` sửa state tại chỗ (ADR-0010) nên
  tick trước đã bị ghi đè xong khi ai đó muốn nhìn.
- Nháy sáng, vệt hard drop và rung là **đồng hồ đếm bằng millisecond**, không phải
  bằng tick — chúng không thuộc về engine, nơi thời gian chỉ tồn tại dưới dạng tick
  nguyên (bất biến #2).

## 2. Quyết định

`render/effects.ts` là **nơi duy nhất** được giữ trí nhớ thị giác. Ranh giới trong
`architecture.md` §3 đổi thành: `render/` được giữ **state trình bày suy ra từ state
engine và event**, và **không ai được đọc ngược lại** — không `runtime/`, không `ui/`,
và tuyệt đối không `engine/`.

Engine **không đổi một dòng** trong feature này.

Ba ràng buộc đi kèm:

1. Một object duy nhất, tạo cùng renderer, `advance()` chỉ trừ số. Danh sách ô phơi
   ra dưới dạng **buffer dùng chung + số đếm**, không phải mảng cắt ra mỗi frame
   (NFR-PERF-03).
2. `prefers-reduced-motion` đọc bằng `matchMedia` **có lắng nghe thay đổi**, không
   chụp một lần lúc khởi tạo (NFR-A11Y-05).
3. Không ngoại suy. Vẽ ở giữa hai điểm đã biết, không đoán điểm chưa tới.

## 3. Phương án đã loại

| Phương án | Vì sao loại |
| --- | --- |
| Engine giữ vị trí float song song với vị trí nguyên | Một số thực trong state engine chỉ cách một lần refactor là bị dùng cho **logic**, và lúc đó bất biến #2 chết mà không test nào đỏ |
| Module `anim/` riêng ở cấp cao nhất | Thêm một ranh giới cho dữ liệu chỉ có duy nhất renderer đọc. Ranh giới không ai đi qua là ranh giới thừa |
| Đặt trong `runtime/` | Buộc `runtime/` biết về hiệu ứng thị giác — đúng thứ nó không nên biết |
| Vẽ khối đang rơi bằng DOM + CSS transform | CSS lo nội suy hộ, nhưng thành hai hệ toạ độ phải đồng bộ mỗi lần resize và đổi DPR, và khối bị composite tách khỏi bàn chơi |

## 4. Hệ quả

**Được:**
- Engine giữ nguyên tính deterministic; replay không đổi một chút nào.
- Mọi thứ liên quan animation nằm trong một file đọc hết trong một lần.
- Tắt animation là trả 0 từ một chỗ, không phải rải `if` khắp renderer.

**Mất / phải chấp nhận:**
- `render/` không còn thuần. Người đọc `architecture.md` phải đọc thêm dòng ngoại lệ.
- Hình ảnh **đi sau trạng thái** tối đa một tick. Với gravity không ai nhận ra; với
  di chuyển ngang thì người chơi thi đấu có thể thấy, nên tween ngang cố ý ngắn
  (45ms) và sẽ bật/tắt được ở feature Settings.
- Hai nguồn sự thật về "khối đang ở đâu": ô thật trong engine và ô đang vẽ. Chúng chỉ
  được phép lệch nhau trong khoảng vẽ; bất kỳ logic nào đọc vị trí **phải** đọc
  engine.

**Điều kiện xem lại:** nếu có thứ hai ngoài renderer cần cùng dữ liệu này — lúc đó nó
đúng là một module riêng, không còn là bộ nhớ của renderer.
