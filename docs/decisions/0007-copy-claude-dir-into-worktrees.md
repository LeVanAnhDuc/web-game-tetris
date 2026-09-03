# ADR-0007 · Copy `.claude/` vào worktree, và xoá bản copy sau khi merge

> **Ngày:** 2026-09-03
> **Trạng thái:** accepted
> **Liên quan:** ADR-0001

## 1. Bối cảnh

`.claude/CLAUDE.md` buộc mọi feature phải build trong worktree branch từ
`origin/main`. Nhưng `.gitignore` của repo ignore `/.claude/`, và `git worktree` chỉ
checkout file được track — nên worktree tạo ra **không có** `CLAUDE.md`, không có
skill `feature-flow` và `design-bootstrap`, không có 4 hook tài liệu. Nghĩa là quy
trình tự phá chính nó: làm đúng yêu cầu worktree thì mất toàn bộ luật của dự án.
Kiểm tra thêm cho thấy `.claude/` ở đây **không** phải git repo riêng như các sản
phẩm gen-1 của workspace — nó chỉ là thư mục thường, 10 file, 53KB. `/.worktrees/`
cũng chưa được ignore, nên worktree đặt trong repo sẽ hiện ra như untracked.

## 2. Quyết định

`.claude/scripts/worktree-new.sh` tạo worktree tại `.worktrees/<feature>/` rồi **copy**
`.claude/` vào đó (bỏ `.doc-state/`); `.claude/scripts/worktree-done.sh` xoá bản copy
rồi tháo worktree, chạy **sau khi** branch đã merge. Thêm `/.worktrees/` vào
`.gitignore`. Bản copy là **chỉ đọc**: trước khi xoá, `worktree-done.sh` diff bản copy
với bản gốc và **từ chối xoá** nếu lệch, in ra diff (`--force` để bỏ qua) — để một
thay đổi `.claude/` làm nhầm trong worktree không mất im lặng. Cả hai script từ chối
chạy khi đang ở trong một worktree.

## 3. Phương án đã loại

| Phương án | Vì sao loại |
| --- | --- |
| Junction / symlink `.claude` từ worktree về gốc | Một nguồn duy nhất nên không bao giờ lệch — về kỹ thuật là hơn. Bị loại vì người dùng chọn copy; và symlink trên Windows còn cần Developer Mode hoặc quyền admin, còn junction thì `cp`/`rm` của Git Bash xử lý không nhất quán |
| Bỏ `/.claude/` khỏi `.gitignore`, commit nó vào repo | Đổi bản chất một tầng instruction đang cố ý là local-only, và kéo `settings.local.json` (chứa cấu hình máy cá nhân) vào lịch sử công khai |
| Tách `.claude/` thành repo riêng như gen-1 (`claude-architecture-*`) | Đúng với gen-1 nhưng thêm một repo phải đồng bộ tay cho một dự án học tập một người |
| Không dùng worktree, chỉ branch tại chỗ | Mất isolation — không giữ được `main` chạy được song song, và đi ngược `CLAUDE.md` |

## 4. Hệ quả

**Được:**
- Worktree có đủ `CLAUDE.md`, skill và hook, nên feature build trong đúng môi trường.
- Copy 53KB nên gần như tức thì, không phụ thuộc quyền đặc biệt của Windows.
- Guard diff biến rủi ro "mất thay đổi im lặng" thành một lỗi chặn có in diff.

**Mất / phải chấp nhận:**
- Hai bản `.claude/` tồn tại song song trong lúc feature đang mở → **có thể lệch**.
  Guard phát hiện lúc xoá, tức là phát hiện **muộn**, không phải lúc sửa.
- Sửa `.claude/` giữa lúc một feature đang mở thì worktree đang chạy vẫn dùng bản cũ
  cho tới khi tạo lại worktree.
- Thêm hai script phải tự bảo trì, và chúng nằm trong `.claude/` nên **không** được
  commit vào repo này — mất máy là mất chúng.

**Điều kiện xem lại quyết định này:** nếu hai bản lệch nhau gây ra sự cố thật, hoặc
nếu `.claude/` lớn tới mức copy thành chậm — lúc đó junction là phương án đầu tiên.
