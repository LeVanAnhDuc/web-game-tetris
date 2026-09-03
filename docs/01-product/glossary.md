# Thuật ngữ

> **Trả lời:** Khái niệm này gọi là gì trong code, và hiện ra sao trên UI?
> **Trạng thái:** 🟡 một phần
> **Cập nhật:** 2026-09-03 · commit a5a5e33
> **Cập nhật khi:** xuất hiện một khái niệm nghiệp vụ mới trong code hoặc UI

<!-- CÁCH ĐIỀN
File này KHOÁ TÊN GỌI. Mục đích: mọi phiên làm việc đặt tên biến / bảng / route
giống nhau, thay vì mỗi lần tự nghĩ ra một tên mới cho cùng một khái niệm.

Chỉ thêm dòng khi khái niệm ĐÃ xuất hiện trong code hoặc UI. Bảng đầy khái niệm
tưởng tượng thì vô dụng.

Đổi trạng thái sang 🟡 ngay khi có dòng thật đầu tiên.
KHÔNG chứa: giải thích nghiệp vụ dài (-> overview.md).
-->

🟡 vì đây là các khái niệm đã có trong code **sau feature `core-gameplay`**. Feature
sau thêm khái niệm nào thì thêm dòng đó, không điền trước.

Cột "Tên trên UI" trống nghĩa là khái niệm **không hiện lên UI** — nó chỉ tồn tại
trong code, và đó là câu trả lời đúng chứ không phải chỗ còn thiếu.

| Thuật ngữ | Định nghĩa một câu | Tên trong code | Tên trên UI (VI) | Tên trên UI (EN) |
| --- | --- | --- | --- | --- |
| Tetromino | Một khối gồm 4 ô, có 7 loại | `Kind` (`'I' \| 'J' \| ... \| 'Z'`) | — | — |
| Trạng thái xoay | Một trong 4 hướng của khối: 0 · R · 2 · L | `Rot` (`0 \| 1 \| 2 \| 3`) | — | — |
| Khối đang rơi | Khối người chơi đang điều khiển | `Active` / `state.active` | — | — |
| Bàn chơi | Lưới 10×40, trong đó 20 hàng dưới là vùng nhìn thấy | `board: Uint8Array` | Bàn chơi | Playfield |
| Vùng đệm | 20 hàng trên, nơi khối sinh ra và nơi phát hiện lock-out | `BUFFER_ROWS` | — | — |
| Tick | Một bước thời gian của engine, 1/60 giây | `tick` · `TICK_HZ` | — | — |
| Lệnh | Một lần nhấn hoặc nhả, không phải một hành động đã lặp | `Command` (`press` / `release`) | — | — |
| Túi 7 | Bộ sinh khối đảm bảo mỗi 7 khối có đủ 7 loại | `BagState` · `nextKind()` | — | — |
| Hàng chờ | 5 khối kế tiếp đang lộ ra | `queue` | Kế tiếp | Next |
| Giữ khối | Gửi khối hiện tại vào chỗ chứa, một lần mỗi khối | `hold` · `holdUsed` | Giữ | Hold |
| Hình bóng | Vị trí khối sẽ đáp nếu thả xuống ngay | `ghostRow()` | — | — |
| Thả chậm | Tăng tốc rơi trong lúc giữ phím | `softDrop` | Thả chậm | Soft drop |
| Thả tức thì | Đưa khối xuống đáy và chốt ngay | `hardDrop` | Thả tức thì | Hard drop |
| Lock delay | Khoảng chờ trước khi khối chạm đáy bị chốt | `lockTimer` · `cfg.lockDelay` | — | — |
| Move reset | Mỗi lần di chuyển hợp lệ khi đang chạm đáy sẽ đặt lại lock delay, tối đa 15 | `moveResets` · `cfg.moveResetMax` | — | — |
| DAS | Độ trễ trước khi khối tự chạy ngang | `cfg.das` | DAS | DAS |
| ARR | Nhịp tự chạy ngang sau DAS | `cfg.arr` | ARR | ARR |
| Wall kick | Danh sách 5 vị trí thử khi xoay bị chặn | `tryKicks()` · `JLSTZ_KICKS` · `I_KICKS` | — | — |
| T-spin | Xoay khối T vào khe kín, ≥3 góc bị chiếm | `detectSpin()` → `'tspin'` | T-Spin | T-Spin |
| T-spin mini | T-spin mà hai góc phía mũi không cùng bị chiếm | `detectSpin()` → `'mini'` | T-Spin Mini | T-Spin Mini |
| Combo | Số lần xoá hàng liên tiếp không gián đoạn | `stats.combo` | Combo | Combo |
| Back-to-back | Hai lần xoá hàng "khó" liền nhau, nhân 1.5 | `stats.b2b` | Back-to-back | Back-to-back |
| Perfect clear | Xoá hết bàn, không còn ô nào | `stats.perfectClears` | — | — |
| Block out | Khối mới sinh ra đã chồng lên ô có sẵn | `topOutReason: 'blockOut'` | Khối đã chồng tới đỉnh | The stack reached the top |
| Lock out | Khối chốt hoàn toàn phía trên vùng nhìn thấy | `topOutReason: 'lockOut'` | Một khối đã đáp phía trên bàn chơi | A piece came to rest above the field |
| PPS | Số khối đặt được mỗi giây | `stats.piecesPlaced / seconds` | PPS | PPS |
| Replay | Seed cộng chuỗi lệnh, đủ để tái tạo cả lượt chơi | `Replay` · `createRecorder()` | — | — |

**Tên bị cấm:** dùng `Kind` cho loại khối, **không** dùng `Piece`/`Shape`/`Block`
(`Shape` đã là ma trận ô của một trạng thái xoay). Dùng `Command`, không dùng
`Input`/`Event` cho cùng thứ đó. Dùng `topOut` cho kết thúc lượt, không dùng
`gameOver` trong engine (`gameOver` chỉ là tên của `phase`).
