# ADR-0013 · Thiết lập có schemaVersion, và tốc độ rơi là config của engine

> **Ngày:** 2026-09-04
> **Trạng thái:** accepted
> **Liên quan:** FR-17 · FR-23 → FR-30 · FR-42 → FR-44 · NFR-REL-02 · NFR-REL-03 · ADR-0002 · ADR-0004

## 1. Bối cảnh

Người dùng muốn ba chế độ độ khó, một tốc độ rơi tự đặt, và bật/tắt âm thanh. Cả ba
cần một chỗ để ở, mà màn Settings và `SettingsRepository` chưa tồn tại — ADR-0004 đã
cố ý không viết chúng khi chưa ai gọi.

Vướng mắc thật nằm ở tốc độ rơi. Hiện `{seed, commands}` tái tạo trọn một lượt vì
gravity chỉ suy ra từ `level`. Cho người chơi đặt tốc độ nghĩa là **cùng seed, cùng
chuỗi lệnh, khác kết quả** — replay chết mà không có gì báo (ADR-0002).

## 2. Quyết định

**Thiết lập** là một object có `schemaVersion`, đọc qua `migrateSettings` kiểm từng
trường và **kẹp giá trị**, không phải `JSON.parse` rồi tin. Dữ liệu hỏng rơi về **mặc
định**, không rơi về cực trị: `das` rơi về cận dưới nghĩa là auto-repeat không độ trễ
— một game khác hẳn game người chơi đang có.

**Tốc độ rơi là `Config` của engine**, không phải state của UI: `gravityScale` cho ba
preset (nhân vào đường cong Guideline, nên giữ được tiến trình lên cấp) và
`fixedCellsPerSecond` cho tốc độ tự đặt (**thay** đường cong, vì "tôi muốn nhanh thế
này" nghĩa là một tốc độ, không phải một tốc độ vẫn leo).

**`Replay` mang theo `cfg`.** Đây là hệ quả bắt buộc, không phải tuỳ chọn.

**Thiết lập chạm engine chỉ áp ở lượt kế tiếp**; thiết lập trình bày áp ngay. Mở
Settings sẽ tạm dừng game trước.

## 3. Phương án đã loại

| Phương án | Vì sao loại |
| --- | --- |
| Độ khó là một "mode" riêng | §Non-Goals cấm mode biến thể. Đây là thiết lập tốc độ của Marathon, không phải Puzzle/Cheese/Zen |
| Đổi tốc độ giữa lượt | Replay sẽ mô tả một ván chưa từng xảy ra, và điểm giữa các tốc độ không so được |
| Preset là tốc độ cố định thay vì hệ số | Mất tiến trình lên cấp — Dễ sẽ mãi mãi dễ, và FR-11 thành vô nghĩa |
| Không có `schemaVersion`, cứ `JSON.parse` | Thêm một action mới là hoặc crash hoặc xoá sạch keybind của người chơi |
| Cho `NaN` rơi về cận dưới cho gọn | `das = 0` là auto-repeat tức thì. Dữ liệu hỏng không được đổi cách game chơi |
| Dùng file âm thanh | §Non-Goals cấm nhạc có bản quyền, và trần chi phí 0đ; oscillator không tốn byte bundle nào |

## 4. Hệ quả

**Được:**
- Ba preset chỉ nhân hệ số nên T-spin, lock delay và mọi luật khác vẫn đúng ở mọi độ khó.
- Replay vẫn tái tạo được, vì nó mang theo điều kiện đã chơi.
- Storage hỏng hoặc bị chặn thì vẫn chơi được, và UI **nói ra** thay vì im lặng.

**Mất / phải chấp nhận:**
- **Điểm giữa các độ khó không so được với nhau.** Bảng điểm cao ở feature sau phải
  tách theo độ khó, nếu không nó chỉ đo được ai chọn Dễ.
- Đổi độ khó không có tác dụng cho tới lượt sau. Có thể gây bất ngờ; đổi lại là replay
  và điểm số giữ được ý nghĩa.
- `Config` giờ có hai trường mà chỉ UI đặt. Engine vẫn không biết Settings tồn tại,
  nhưng bề mặt của nó đã rộng ra.
- Âm thanh tự sinh nghe "điện tử". Đánh đổi có ý thức để lấy 0 byte tài nguyên.

**Điều kiện xem lại:** khi có bảng điểm cao — lúc đó phải quyết điểm ở tốc độ tự đặt
có được ghi hay không.
