# Thiết kế · `animation`

**Liên quan:** FR-35 → FR-40 · US-01 · NFR-PERF-01 · NFR-PERF-03 · NFR-A11Y-05 ·
ADR-0003 · ADR-0009 · ADR-0010 · ADR-0012

Không nhắc lại `architecture.md`, `invariants.md` hay `MASTER.md`.

## 1. Vấn đề

Animation cần **trí nhớ**, mà kiến trúc hiện tại cố tình không cho ai nhớ gì:
`reduce` sửa state tại chỗ (ADR-0010) nên không tồn tại "state của tick trước" để nội
suy, và `architecture.md` §3 ghi `render/` "không giữ state riêng".

## 2. Quyết định gốc: nội suy ở renderer, engine không đổi

Bất biến #2 nói engine chỉ tiến theo **tick nguyên**. Chuyển động mượt là việc của
tầng vẽ: `loop` truyền `alpha = acc / STEP_MS` vào `draw`, renderer vẽ khối ở
`prev + alpha × (cur − prev)`.

**Engine không đổi một dòng trong feature này.**

Phương án đã loại: để engine giữ vị trí float song song (một số thực trong state
engine chỉ cách một lần refactor là bị dùng cho logic, và lúc đó bất biến #2 chết mà
không test nào đỏ); vẽ khối đang rơi bằng DOM/CSS đè lên canvas (hai hệ toạ độ phải
đồng bộ mỗi lần resize và đổi DPR).

## 3. `render/effects.ts` — nơi duy nhất được phép nhớ

Giữ đúng bốn nhóm giá trị, tất cả là số cố định trong một object sống suốt phiên:

| Nhớ gì | Vì sao | Nạp từ |
| --- | --- | --- |
| `prevCol` `prevRow` | ADR-0010 xoá state cũ — không có điểm đầu thì không nội suy | mỗi tick |
| `flashT` | che cú snap lúc chốt | event `lock` |
| `trailFromRow` `trailT` | vệt hard drop | event `hardDrop` |
| `shakeT` | rung khi Tetris | event `clear` với `rows === 4` |

**Xoá hàng không cần nhớ gì.** Engine đã giữ `phase === 'lineClearDelay'` và
`clearTimer` đếm ngược từ `cfg.clearDelay`, và các hàng đầy vẫn nằm trên board suốt
khoảng đó. Renderer suy tiến độ từ `clearTimer`.

## 4. Ba quy tắc để nội suy không tự sinh lỗi

1. **Không nội suy phép xoay.** Wall kick đẩy khối tới 2 ô; tween qua đó trông như
   khối xuyên tường. Xoay là tức thì.
2. **Snap `prev = cur` khi khối đổi danh tính** — chốt, hold, sinh khối mới. Thiếu thì
   khối mới bay từ chỗ khối cũ vừa chết.
3. **Nội suy là đi sau, không đoán trước.** Không ngoại suy: đoán sai rồi giật ngược
   tệ hơn trễ một tick.

## 5. Sáu hiệu ứng

| ID | Hiệu ứng | Thời lượng | Cách vẽ |
| --- | --- | --- | --- |
| FR-35 | Rơi mượt (nội suy gravity) | liên tục | `prev + alpha × (cur − prev)` theo hàng |
| FR-36 | Di chuyển ngang mượt | liên tục | như trên, theo cột |
| FR-37 | Nháy sáng khi chốt | 80ms | phủ trắng giảm dần lên đúng 4 ô vừa chốt |
| FR-38 | Vệt hard drop | 100ms | các ô mờ dần từ hàng xuất phát tới hàng đáp |
| FR-39 | Xoá hàng: nháy → sụp | 300ms (= `clearDelay`) | 80ms phủ trắng, 220ms các hàng trên trượt xuống |
| FR-40 | Rung bàn chơi khi Tetris | 180ms | dịch cả canvas theo biên độ giảm dần |

Ngoài canvas, HUD (React) thêm: nháy khi lên cấp và điểm đếm tăng dần. Chúng nằm
ngoài ngân sách frame của bàn chơi.

**Easing:** `easeOutCubic` cho phần sụp và vệt, tuyến tính cho nháy sáng. Rung dùng
sin tắt dần, biên độ tối đa 4px, **không đổi kích thước canvas** — chỉ dịch điểm vẽ.

## 6. `prefers-reduced-motion` (NFR-A11Y-05)

Đọc bằng `matchMedia` **và lắng nghe thay đổi**, không đọc một lần lúc khởi tạo —
người dùng đổi thiết lập hệ điều hành giữa chừng là chuyện có thật.

Khi bật: `alpha` coi như 1 (khối nhảy từng ô như hiện tại), mọi đồng hồ hiệu ứng trả
0, rung tắt hẳn. Xoá hàng vẫn mất 300ms vì đó là `clearDelay` của engine, nhưng không
có nháy và không có trượt — hàng biến mất, khối trên xuất hiện ở vị trí mới.

## 7. Hiệu năng (NFR-PERF-03)

`effects` là **một object duy nhất**, tạo một lần cùng renderer. `advance()` chỉ trừ
số. Vệt hard drop dùng mảng cố định 4 phần tử tái dùng. Không `new` gì trong
`draw()`.

Sprite vát cạnh (ADR-0009) không đổi. Nháy sáng và vệt vẽ bằng `globalAlpha` +
`fillRect` trên sprite đã có, không pre-render thêm bộ sprite thứ hai.

## 8. Test

| Vùng | Cách |
| --- | --- |
| `loop.ts` | `alpha` trong `[0,1]`, bằng 0 ngay sau một tick trọn, tăng giữa hai tick |
| `effects.ts` | snap khi đổi khối · đồng hồ giảm đúng theo dt · reduced-motion trả 0 · không cấp phát (so sánh tham chiếu mảng vệt) |
| nội suy | hàm thuần `lerp(prev, cur, alpha)` test riêng |
| canvas | **không** unit test — kiểm bằng mắt trên app thật |
