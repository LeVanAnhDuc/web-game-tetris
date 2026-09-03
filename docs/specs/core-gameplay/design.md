# Thiết kế · `core-gameplay`

**Liên quan:** FR-01 → FR-22 · US-01 · NFR-PERF-01 · NFR-PERF-02 · NFR-PERF-03 ·
NFR-REL-01 · NFR-REL-04 · NFR-A11Y-02 · NFR-A11Y-03 · NFR-A11Y-05 · NFR-I18N-01 ·
NFR-I18N-04 · ADR-0001 → ADR-0010

Tài liệu này **không** nhắc lại `architecture.md` (ranh giới module), `invariants.md`
(12 bất biến) hay `MASTER.md` (token). Nó chỉ nói những gì riêng của feature này.

---

## 1. Phạm vi

Vòng lặp chơi Marathon hoàn chỉnh: FR-01 → FR-22. Không có màn Settings (FR-23→30) và
không có bảng điểm cao (FR-31→34) — nút `⚙` và `EN` có mặt trên UI nhưng **không dẫn
đi đâu**, chúng giữ chỗ để layout không phải đổi ở feature sau.

Thiết lập điều khiển ở feature này là **hằng số trong code**, không đọc từ storage.
`SettingsRepository` chưa tồn tại. `ScoreRepository` cũng chưa — kết thúc lượt chỉ
hiện kết quả, chưa lưu điểm cao.

## 2. Bề mặt API của `engine/`

```ts
// engine/index.ts — tất cả những gì engine phơi ra
export function createGame(seed: number, cfg?: Partial<Config>): GameState
export function reduce(s: GameState, cmds: readonly Command[]): GameState
export function drainEvents(s: GameState): readonly GameEvent[]
export function ghostRow(s: GameState): number | null
export function cellAt(s: GameState, row: number, col: number): number
```

`Command` là `{k: 'press'|'release', a: Action}`. `Action` là
`left · right · softDrop · hardDrop · rotCW · rotCCW · hold · pause`.
**Không có** `moveLeftOnce` — `input/` chỉ báo nhấn và nhả; DAS/ARR do engine đếm
(ADR-0005).

`GameEvent` là `lock · clear · levelUp · topOut · hold · rotate · kick` — dùng cho âm
thanh (FR-17) và cho HUD nhịp thấp. Engine **không** phát event mỗi tick.

## 3. Hợp đồng tick

Một tick = 1/60 giây. `reduce` chỉ tiến theo tick nguyên và không đọc đồng hồ.
Thứ tự trong một tick, cố định:

1. nạp `cmds` → cập nhật `held`, xử lý nhấn một lần (rotate, hardDrop, hold, pause)
2. DAS/ARR → sinh bước ngang nếu tới nhịp
3. gravity → cộng `gravityAcc`, hạ khối theo số ô nguyên đã tích được
4. lock delay → nếu khối đang chạm đáy thì đếm `lockTimer`; hết thì chốt
5. nếu vừa chốt: tìm hàng đầy → sang `lineClearDelay`, đếm `clearTimer`, rồi mới xoá
   và sinh khối mới
6. `tick += 1`

Bước 5 là hai pha vì FR-10 cần một khoảng nhìn thấy hàng biến mất. Trong pha
`lineClearDelay` mọi input bị **bỏ qua trừ `pause`**.

## 4. `reduce` sửa state tại chỗ

`reduce(s, cmds)` **mutate `s`** rồi trả về chính nó. Không copy. Lý do và phương án
đã loại: **ADR-0010**. Hệ quả cho người viết test: không giữ tham chiếu tới state cũ
và mong nó không đổi; muốn so sánh trước/sau thì chụp lại giá trị cần, không chụp
object.

## 5. Board

`Uint8Array(400)` — 10 cột × 40 hàng, hàng 0 ở **trên cùng**, hàng 20→39 là vùng nhìn
thấy, 0→19 là vùng đệm. `0` là ô trống, `1..7` là `I J L O S T Z` theo đúng thứ tự đó.

Mọi kiểm tra biên dùng hằng `VISIBLE_ROWS`, không rải số `20` (bất biến #9).

## 6. SRS

Bảng wall kick lưu theo quy ước **y dương là LÊN** (đúng quy ước của bảng gốc), và
được đổi dấu **đúng một chỗ** khi áp vào board: `row -= dy`.

Xoay thử 5 offset **đúng thứ tự bảng** và lấy kết quả thành công **đầu tiên** (bất
biến #5). Chỉ số offset thành công được lưu vào `lastKickIndex` — nó là thứ phân biệt
T-spin thật với T-spin mini.

**Về độ tin cậy của bảng:** `tetris.wiki` và `harddrop.com` đều trả HTTP 403 trong
phiên 2026-09-03, `tetris.fandom.com` trả 402. Bảng trong code được đối chiếu khớp
**16/16 dòng** với một implementation độc lập
(`github.com/jasonbai2014/Tetris`, `src/model/WallKick.java`) — tức một **nguồn thứ
hai**, không phải spec gốc của Tetris Company. Nếu sau này đọc được spec gốc và thấy
lệch, sửa `srs.ts` và test đi kèm.

`O` không xoay và không kick.

## 7. Hằng số thời gian

| Hằng | Giá trị | Nguồn |
| --- | --- | --- |
| `TICK_HZ` | 60 | ADR-0003 |
| `LOCK_DELAY` | 30 tick (500ms) | FR-09 |
| `MOVE_RESET_MAX` | 15 | FR-09, bất biến #8 |
| `CLEAR_DELAY` | 18 tick (300ms) | FR-10 |
| `DAS` | 8 tick (~133ms) | FR-15 |
| `ARR` | 2 tick (~33ms) | FR-15 |
| `SOFT_DROP_FACTOR` | 20× gravity, sàn 1/3 ô/tick | FR-07 |
| `MAX_TICKS_PER_FRAME` | 5 | NFR-REL-04 |
| `QUEUE_LEN` | 5 | FR-04 |

Gravity theo cấp độ: `secondsPerRow = (0.8 - (L-1)*0.007) ^ (L-1)`, luỹ thừa tính
bằng **nhân lặp**, không dùng `Math.pow` — `Math.pow` không được đảm bảo giống nhau
bit-for-bit giữa các JS engine, mà replay cần đúng bit (ADR-0002). Cấp độ tăng mỗi 10
hàng (FR-11), chặn trên ở 20.

## 8. Điểm

Nhân với cấp độ hiện tại: single 100 · double 300 · triple 500 · tetris 800.
T-spin: mini 100 · mini single 200 · no-line 400 · single 800 · double 1200 ·
triple 1600. Back-to-back nhân **1.5** (chỉ cho tetris và T-spin có xoá hàng).
Combo `50 × combo × level`. Soft drop 1 điểm/ô, hard drop 2 điểm/ô. Perfect clear
single 800 · double 1200 · triple 1800 · tetris 2000, nhân cấp độ.

**Nhận T-spin (FR-19):** khối vừa đi là **xoay** (`lastMove === 'rotate'`), kind là
`T`, và ≥3 trong 4 góc quanh tâm chữ T bị chiếm (ngoài biên tính là bị chiếm). Là
**mini** nếu hai góc phía "mũi" T không cùng bị chiếm, **trừ khi** `lastKickIndex === 4`
(offset cuối) — lúc đó là T-spin thật.

## 9. Kết thúc lượt (FR-12)

- **Block out:** khối mới sinh ra đã chồng lên ô có sẵn.
- **Lock out:** khối chốt xong mà **toàn bộ** ô của nó nằm trên hàng `VISIBLE_ROWS`.

Cả hai đặt `phase = 'gameOver'` và phát `topOut`.

## 10. Deterministic và replay (FR-18)

`rng.ts` là mulberry32, nhận seed. `bag.ts` giữ **một** instance cho một lượt (bất
biến #6). `runtime/recorder.ts` ghi `{seed, commands: [{tick, k, a}]}`. Chưa có UI xem
lại và **chưa ghi vào storage** — feature này chỉ giữ replay trong memory và phơi ra
qua `session.getReplay()`, đủ để test tái tạo và đủ để cắm chỗ lưu sau này.

Test tái tạo: chạy cùng seed + cùng chuỗi command hai lần, so `board` và `stats` — phải
giống hệt.

## 11. Render (ADR-0009)

`render/sprites.ts` pre-render 8 sprite (7 hue + ghost) đã vát cạnh vào một
`OffscreenCanvas` (fallback `document.createElement('canvas')`) **một lần cho mỗi cỡ
ô**. `canvas.ts` mỗi frame chỉ `drawImage` một lệnh cho mỗi ô — không vẽ 3 lệnh mỗi ô
(NFR-PERF-01).

Cỡ ô suy ra từ kích thước khả dụng và `devicePixelRatio`; đổi cỡ thì pre-render lại.
Vùng đệm (hàng 0→19) **không** được vẽ.

## 12. Input

`KeyboardInput` gắn vào `window`, `preventDefault` cho các phím game để trang không
cuộn khi bấm Space/mũi tên. **Mất focus thì clear toàn bộ phím đang giữ** — bỏ sót
`keyup` là khối chạy mãi (ADR-0005 §4).

`TouchInput` gắn `pointerdown`/`pointerup` vào các nút trong band cảm ứng; nút giữ
được nên DAS/ARR áp cả trên cảm ứng.

Phím mặc định (FR-15): `←→` di chuyển · `↓` soft drop · `Space` hard drop ·
`Z` xoay trái · `X` xoay phải · `Shift` hold · `Esc` pause.

## 13. i18n (NFR-I18N-01, NFR-I18N-04)

`en.json` và `vi.json` cùng tập key. Feature này thêm các key của màn chơi và hai
modal. Nút đổi ngôn ngữ là feature 3; ở đây locale đoán từ `navigator.language` một
lần và không đổi được trong app. Có test so **tập key hai file phải bằng nhau**.

## 14. Chiến lược test

| Vùng | Cách test |
| --- | --- |
| `srs.ts` | bảng kick: mọi transition, mọi offset. Cả case T-spin triple |
| `bag.ts` | 7 khối liên tiếp không lặp; qua 7 túi phân phối đúng 7 mỗi loại |
| `board.ts` | collision ở 4 biên · xoá 1/2/3/4 hàng · lỗ hổng không bị xoá |
| `timing.ts` | gravity theo cấp độ · lock delay · move reset cap 15 · DAS/ARR |
| `scoring.ts` | 6 loại T-spin · combo · b2b · perfect clear |
| `game.ts` | tái tạo bằng seed · block out · lock out · pause bỏ qua input |
| `i18n` | hai locale cùng tập key |
| `render` | **không** unit test — canvas không query được. Kiểm bằng mắt ở bước 5 |

Vitest, môi trường `node` cho engine và `jsdom` cho phần chạm DOM.
