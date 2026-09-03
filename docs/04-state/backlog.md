# Đang làm · Việc tiếp theo · Nợ

> **Trả lời:** Đang làm gì, tiếp theo làm gì, và đang nợ những gì?
> **Trạng thái:** 🟢 đủ
> **Cập nhật:** 2026-09-03 · commit 4fc9aae
> **Cập nhật khi:** bắt đầu/kết thúc một việc · brainstorm ra việc mới · cố ý đi đường tắt

<!-- CÁCH ĐIỀN
Mục "Đang làm" là chỗ một phiên làm việc MỚI đọc đầu tiên. Giữ nó ngắn: đang làm
gì, dừng ở bước nào, cái gì đang chặn. Cập nhật nó TRƯỚC KHI DỪNG phiên, không
phải sau.

Mục "Nợ kỹ thuật" chỉ ghi thứ CỐ Ý làm tạm, và ghi NGAY LÚC ĐÓ. Bug thì không
thuộc đây. Việc chưa làm cũng không — đó là mục 2.

KHÔNG chứa: tính năng ngoài phạm vi (-> 01-product/overview.md §Non-Goals).
-->

## Đang làm

**Không có việc nào đang dở.**

Feature `core-gameplay` đã xong và merge: FR-01→FR-16, FR-18→FR-22 và FR-31 sang
`xong` trong `scope.md`. 127 test xanh, typecheck sạch, build ra 71.5KB gzip, đã xem
app thật ở 375/768/1024/1440 với 0 lỗi console.

**Ngoại lệ phải nhớ:** `FR-17` (hiệu ứng âm thanh) nằm trong phạm vi `design.md` của
feature này nhưng **không có task nào trong `plan.md`** và không được hiện thực. Nó
đã dồn sang feature `controls-settings` để đi cùng `FR-27` (âm lượng) — phát tiếng mà
không có cách tắt thì tệ hơn im lặng.

## Việc tiếp theo

| Việc | Liên quan | Ưu tiên | Vì sao ưu tiên đó |
| --- | --- | --- | --- |
| Feature `core-gameplay` | FR-01 → FR-22 | cao | vòng lặp cốt lõi; mọi feature khác phụ thuộc vào engine của nó |
| Feature `controls-settings` | FR-17 · FR-23 → FR-30 | **cao** | người chơi mục tiêu coi việc chỉnh DAS/ARR là bắt buộc; và FR-17 nợ từ `core-gameplay` phải trả ở đây |
| Feature `stats-highscores` | FR-32 → FR-34 | trung bình | cần `LocalIdentity` và `ScoreRepository`; FR-31 đã xong ở modal kết thúc lượt |
| Bật GitHub Pages cho repo | ADR-0001 | thấp | chỉ làm được sau khi có bản build đầu tiên |
| Chế độ Sprint 40 lines và Ultra 2 phút | — | thấp | dùng chung engine, chỉ khác điều kiện kết thúc và chỉ số hiển thị. **Không** phải Non-Goal — cấp FR mới khi làm |
| Màn hình xem lại replay | FR-18 | thấp | dữ liệu replay đã được ghi từ bản đầu (ADR-0002); chỉ thiếu giao diện |
| Leaderboard server + đăng nhập qua Ducker ID | ADR-0004 | thấp | **bị chặn bởi bên ngoài**: Ducker ID chưa có `/oauth/authorize`, `/oauth/token`, JWKS |
| Hỗ trợ gamepad | FR-15 | thấp | rẻ nhờ ADR-0005, nhưng khó test tự động |
| PWA / chơi được khi offline | NFR-PERF-05 | thấp | game đã là tĩnh và client-only nên gần như chỉ cần thêm service worker |

## Nợ kỹ thuật — cố ý làm tạm

| Chỗ nào | Đã đánh đổi gì | Vì sao chấp nhận | Khi nào buộc phải trả |
| --- | --- | --- | --- |
| `docs/02-requirements/nfr.md` — NFR-PERF-01, 04, 05 | Ba con số là **ngân sách tự chọn, chưa đo**: 8ms/frame, 200KB gzip, 2s trên 3G | Chưa có bản build nào để đo. Bỏ trống thì file bị bỏ qua âm thầm; viết số như đã đo thì là số bịa | Ngay sau bản build đầu tiên của `core-gameplay` |
| Pass nền móng làm trên branch tại chỗ, **không** dùng worktree | Lệch quy trình worktree của `.claude/CLAUDE.md` | Worktree không có `.claude/` (bị gitignore) nên sẽ mất cả skill lẫn 4 hook — mất nhiều hơn được cho một pass chỉ sửa tài liệu | Khi giải xong dòng đầu của §Việc tiếp theo, và bắt buộc trước khi có code |
| `docs/02-requirements/nfr.md` — NFR-PERF-01, 02, 03, 05 | Bốn ngưỡng vẫn là ngân sách **chưa đo**: frame budget, input latency, cấp phát hot path, thời gian tải | Cần Performance panel, heap snapshot và Lighthouse — mỗi thứ một phiên riêng, và cần một bàn chơi đã xếp cao mới đo có nghĩa | Trước khi tăng độ khó (thêm mode) hoặc khi có báo cáo rớt frame |
| `src/render/canvas.ts` — `draw()` | Vẽ 200 `fillRect` nền well mỗi frame trước khi blit ô | Đơn giản và đúng; chưa đo thấy vượt ngân sách | Ngay khi `NFR-PERF-01` được đo thật và thiếu ngân sách — cách thay là chỉ vẽ ô đã đổi |
| `docs/specs/core-gameplay/design.md` §1 vs `plan.md` | `design.md` nói scope là FR-01→FR-22 nhưng `plan.md` không có task cho FR-17 | Phát hiện lúc cập nhật `scope.md`, sau khi code đã xong | Đã trả một nửa: FR-17 chuyển sang feature 3. Bài học: đối chiếu danh sách FR của `design.md` với danh sách task của `plan.md` **trước** khi bắt đầu code |
