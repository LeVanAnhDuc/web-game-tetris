# Đang làm · Việc tiếp theo · Nợ

> **Trả lời:** Đang làm gì, tiếp theo làm gì, và đang nợ những gì?
> **Trạng thái:** 🟢 đủ
> **Cập nhật:** 2026-09-03 · commit d171af7
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

**Pass nền móng dự án**, trên branch `docs/project-foundation`.

Đã xong: brainstorm chốt phạm vi + stack; điền tier-1 (`overview` · `journeys` ·
`scope` FR-01→FR-34 · `nfr` viết lại · `invariants` viết lại · `architecture`);
viết ADR-0001→ADR-0006.

Remote đã có: `github.com/LeVanAnhDuc/web-game-tetris` (public). `main` và
`docs/project-foundation` đều đã push; **PR #1** đang mở cho branch này.

**Dừng ở bước:** chờ review PR #1. **Chưa có một dòng code nào.**

**Đang chặn:** không có gì chặn việc review. Nhưng trước khi bắt đầu code thì phải
giải xong việc đầu tiên ở §Việc tiếp theo — `.claude/` bị gitignore nên worktree sẽ
không có skill và hook.

## Việc tiếp theo

| Việc | Liên quan | Ưu tiên | Vì sao ưu tiên đó |
| --- | --- | --- | --- |
| Giải bài toán `.claude/` không có trong worktree | — | cao | `feature-flow` bước 3 buộc build trong worktree, nhưng `.claude/` bị `.gitignore` nên worktree không có skill và không có 4 hook. Hướng khả thi trên Windows: junction/symlink. Phải xong **trước** khi build feature đầu tiên |
| Chạy `design-bootstrap` | — | cao | sinh `docs/design-system/tetris/MASTER.md`. Chưa có file này thì không được mở canvas mockup |
| Feature `core-gameplay` | FR-01 → FR-22 | cao | vòng lặp cốt lõi; mọi feature khác phụ thuộc vào engine của nó |
| Feature `controls-settings` | FR-23 → FR-30 | trung bình | người chơi mục tiêu coi việc chỉnh DAS/ARR là bắt buộc |
| Feature `stats-highscores` | FR-31 → FR-34 | trung bình | cần `LocalIdentity` và `ScoreRepository` |
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
| `docs/01-product/glossary.md` để ⚪ | Bộ thuật ngữ EN/VI đã biết trước nhưng chưa được khoá | Chính file đó cấm điền khái niệm chưa xuất hiện trong code hoặc UI | Trong feature `core-gameplay`, điền theo từng khái niệm khi code chạm tới |
