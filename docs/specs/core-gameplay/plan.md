# Kế hoạch thi hành · `core-gameplay`

**Liên quan:** [`design.md`](design.md) · FR-01 → FR-22 · US-01

Checkbox là phòng tuyến chống nén ngữ cảnh: đọc file này là biết đang ở task mấy trên
mấy, không phải đọc lại cả hội thoại. Đánh dấu **ngay khi** task xong, không để cuối.

TDD: test trước, đủ để đỏ, rồi mới code cho xanh. Ngoại lệ duy nhất là `render/` —
canvas không query được, kiểm bằng mắt ở task 16.

---

## Nền

- [x] **1.** Scaffold: `package.json` (npm, không Yarn — ADR-0001), `tsconfig.json`,
  `vite.config.ts`, `vitest` (`node` cho engine, `jsdom` cho DOM), `index.html`,
  `.gitignore` bổ sung `node_modules dist coverage`.
- [x] **2.** `src/engine/types.ts` + `src/engine/config.ts`: `Kind` `Rot` `Action`
  `Command` `GameEvent` `GameState` `Config`, và toàn bộ hằng số ở `design.md` §7.

## Engine — thuần, không DOM, không đồng hồ

- [x] **3.** `rng.ts` + test: mulberry32, cùng seed cho cùng chuỗi; hai seed khác nhau
  cho chuỗi khác nhau.
- [x] **4.** `pieces.ts` + test: 7 kind × 4 trạng thái xoay. Test: mỗi trạng thái đúng
  4 ô; `O` giống nhau ở cả 4 trạng thái.
- [x] **5.** `srs.ts` + test: bảng kick JLSTZ và I, 8 transition × 5 offset, quy ước
  y-lên. Test đối chiếu **từng dòng** với bảng trong `design.md` §6, cộng test "lấy
  offset thành công ĐẦU TIÊN" và một case T-spin triple.
- [x] **6.** `bag.ts` + test: 7-bag. Test: 7 khối đầu không lặp; 70 khối cho đúng 10
  mỗi loại; một bag cho một lượt (bất biến #6).
- [x] **7.** `board.ts` + test: `collides` · `lockPiece` · `findFullRows` ·
  `clearRows` · `isRowFull`. Test: collision 4 biên, xoá 1/2/3/4 hàng, hàng có lỗ
  **không** bị xoá, hằng `VISIBLE_ROWS` (bất biến #9).
- [x] **8.** `timing.ts` + test: `gravityCellsPerTick(level)` bằng nhân lặp (không
  `Math.pow`), lock delay, move-reset cap 15, DAS/ARR. Test: gravity tăng đơn điệu
  theo cấp độ; cấp 1 = 1 ô/60 tick; cap ở cấp 20.
- [x] **9.** `scoring.ts` + test: điểm theo `design.md` §8. Test: 4 loại xoá hàng, 6
  loại T-spin, combo, b2b ×1.5, perfect clear, điểm drop.
- [x] **10.** `game.ts` + test: `createGame` · `reduce` theo đúng thứ tự 6 bước ở
  `design.md` §3 · `drainEvents` · `ghostRow`. Test: tái tạo bằng seed (chạy 2 lần so
  board + stats), block out, lock out, `pause` bỏ qua input khác, `lineClearDelay`
  chặn input.

## Vỏ ngoài — chạm được DOM

- [x] **11.** `runtime/loop.ts` + test: fixed-timestep, accumulator, **cap 5 tick mỗi
  frame** (NFR-REL-04), tự pause khi `document.hidden` (NFR-REL-01). Test bằng cách
  bơm timestamp giả.
- [x] **12.** `runtime/recorder.ts` + `runtime/session.ts`: ghi `{seed, commands}`,
  phát event ra ngoài, **không** gọi `storage/` (ranh giới ở `architecture.md` §3).
- [x] **13.** `input/keyboard.ts` + `input/touch.ts` + test: chỉ phát press/release
  (ADR-0005); **clear hết phím đang giữ khi mất focus**; `preventDefault` cho phím game.
- [x] **14.** `render/sprites.ts` + `render/canvas.ts`: pre-render 8 sprite vát cạnh
  một lần cho mỗi cỡ ô (ADR-0009), mỗi frame một `drawImage` cho mỗi ô, DPR-aware,
  không vẽ vùng đệm.
- [x] **15.** `i18n/` + `en.json` + `vi.json` + test **hai file cùng tập key**
  (NFR-I18N-04).
  **`storage/` và `identity/` BỎ khỏi feature này** — `design.md` §1 nói feature này
  không lưu điểm và không đọc thiết lập, nên hai repository đó sẽ là code không ai
  gọi, đúng thứ ADR-0004 tự cấm ("code chết không chạy được là code sai"). Chúng đi
  cùng feature dùng tới chúng. `NFR-REL-02`/`03` cũng dời theo.
- [x] **16.** `ui/`: `tokens.css` từ `MASTER.md`, `PlayScreen`, HUD, hold/next,
  band cảm ứng, modal pause + game over. Layout theo mockup đã duyệt: 375 → 768 →
  1440. Nút `⚙`/`EN` có mặt, `disabled`, `aria-disabled`, không dẫn đi đâu.

## Chốt

- [x] **17.** `npm run test` xanh · `npm run typecheck` sạch · `npm run build` xong.
- [x] **18.** Xem app thật: screenshot 375 / 768 / 1024 / 1440, thử bàn phím, thử
  pause, thử game over. **UI chưa nhìn bằng mắt thì chưa xong.**
- [x] **19.** `README.md` §Features một dòng · `scope.md` FR-01→FR-22 sang `xong` ·
  `glossary.md` điền theo khái niệm đã có trong code · `backlog.md` §Đang làm.
- [ ] **20.** Commit theo Conventional Commits, mở PR, merge, `worktree-done.sh`.
  Task này **là** commit chứa chính dòng này, cộng lần merge sau đó — nên nó ở lại
  `[ ]` trong lịch sử. Code nằm trên `main` là bằng chứng nó đã xong.
