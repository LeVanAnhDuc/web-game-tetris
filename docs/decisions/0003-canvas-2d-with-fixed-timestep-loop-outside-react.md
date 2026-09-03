# ADR-0003 · Vẽ bàn chơi bằng Canvas 2D, vòng lặp fixed-timestep chạy ngoài React

> **Ngày:** 2026-09-03
> **Trạng thái:** accepted
> **Liên quan:** NFR-PERF-01 · NFR-PERF-02 · NFR-PERF-03 · NFR-REL-01 · NFR-REL-04 · ADR-0001

## 1. Bối cảnh

Bàn chơi phải vẽ lại 60 lần/giây và phản hồi đầu vào trong vòng một frame
(NFR-PERF-01, NFR-PERF-02). Phần còn lại của giao diện — HUD, cài đặt, bảng điểm —
đổi rất chậm và là React (ADR-0001). Hai nhịp này khác nhau hai bậc, nên nếu để
chung một cơ chế cập nhật thì một bên sẽ phải chịu nhịp của bên kia.

## 2. Quyết định

Bàn chơi vẽ trên một thẻ `canvas` bằng Canvas 2D, DPR-aware. Vòng lặp là một
`requestAnimationFrame` sống **ngoài** React: nó cộng thời gian thật vào accumulator
rồi chạy `reduce` theo **tick 60Hz cố định**, tối đa **5 tick mỗi frame**
(NFR-REL-04), sau đó gọi `render.draw(state)`. React chỉ nhận event HUD ở nhịp ~10Hz.
Component React tạo thẻ `canvas` và khởi tạo renderer, nhưng **không** gọi `draw()`.
Tab mất focus thì vòng lặp tự tạm dừng (NFR-REL-01).

## 3. Phương án đã loại

| Phương án | Vì sao loại |
| --- | --- |
| Giữ state game trong `useState`/`useReducer` của React, render bàn chơi bằng JSX | 60 lần `setState` mỗi giây kéo theo reconciliation và cấp phát liên tục; rớt frame vì GC và chỉ lộ trên máy yếu (NFR-PERF-03) |
| Vòng lặp theo `deltaTime` biến thiên | Gravity phụ thuộc tần số quét màn hình — xem ADR-0002 |
| Không cap số tick mỗi frame | Tab bị treo 10 giây rồi quay lại sẽ chạy 600 tick liền một lúc; người chơi chết mà không thấy gì xảy ra |
| WebGL / PixiJS | 200 ô màu phẳng không cần GPU pipeline; thêm một thư viện lớn cho việc Canvas 2D làm dư sức |

## 4. Hệ quả

**Được:**
- Bàn chơi và giao diện chạy ở hai nhịp độc lập, không bên nào kéo bên nào.
- Vòng lặp có một chỗ duy nhất để đo frame budget.
- Cap tick biến một tab bị treo thành một lần tạm dừng, không thành một cái chết.

**Mất / phải chấp nhận:**
- Có hai mô hình cập nhật trong cùng một codebase — người mới đọc phải hiểu vì sao
  bàn chơi không nằm trong React.
- Canvas không có DOM để screen reader đọc; a11y của bàn chơi phải làm riêng bằng
  vùng thông báo (NFR-A11Y-04) chứ không tự có.
- Vẽ trên canvas không kiểm được bằng DOM query, nên test bàn chơi là test trên
  `engine/` cộng với xem bằng mắt ở bước 5 của `feature-flow`.

**Điều kiện xem lại quyết định này:** nếu hiệu ứng đồ hoạ vượt quá khả năng Canvas 2D
(hạt, shader), hoặc nếu a11y của bàn chơi đòi hỏi cấu trúc DOM thật.
