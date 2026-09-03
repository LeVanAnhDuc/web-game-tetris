# Tài liệu dự án `web-game-tetris`

## Bản đồ

<!-- BEGIN:auto — bảng dưới do .claude/scripts/docs-regen.sh sinh từ header của từng file. Đừng sửa tay. -->
| File | Trả lời câu hỏi | Trạng thái | Cập nhật khi |
| --- | --- | --- | --- |
| [`01-product/overview.md`](01-product/overview.md) | Sản phẩm này là gì, cho ai, và **KHÔNG** làm gì? | 🟢 đủ | định vị đổi · thêm/bớt một Non-Goal · trần chi phí đổi |
| [`01-product/journeys.md`](01-product/journeys.md) | Người dùng đi qua những luồng nào từ đầu đến cuối? | 🟢 đủ | có luồng người dùng mới · một luồng cũ đổi bản chất |
| [`01-product/glossary.md`](01-product/glossary.md) | Khái niệm này gọi là gì trong code, và hiện ra sao trên UI… | ⚪ chưa áp dụng | xuất hiện một khái niệm nghiệp vụ mới trong code hoặc UI |
| [`02-requirements/scope.md`](02-requirements/scope.md) | Hệ thống có những chức năng nào, mỗi cái đang ở trạng thái… | 🟢 đủ | brainstorm ra chức năng mới (cấp FR mới) · một FR chuyển t… |
| [`02-requirements/nfr.md`](02-requirements/nfr.md) | Ngưỡng nào áp cho **mọi** feature, để không phải nhắc lại … | 🟢 đủ | thêm loại tài nguyên mới · thêm nhóm người dùng · sau sự c… |
| [`03-design/architecture.md`](03-design/architecture.md) | Hệ thống ghép lại thế nào, ranh giới giữa các phần ở đâu? | 🟢 đủ | thêm/bỏ một module hoặc service · đổi cách hai module nói … |
| [`03-design/invariants.md`](03-design/invariants.md) | Sửa gì thì hệ thống sai **âm thầm** — test vẫn xanh mà kết… | 🟢 đủ | phát hiện một bất biến mới — thường là ngay sau khi ai đó … |
| [`04-state/backlog.md`](04-state/backlog.md) | Đang làm gì, tiếp theo làm gì, và đang nợ những gì? | 🟢 đủ | bắt đầu/kết thúc một việc · brainstorm ra việc mới · cố ý … |
| [`design-system/tetris/MASTER.md`](design-system/tetris/MASTER.md) | — | — | — |
| [`decisions/`](decisions/README.md) | Tại sao lại làm thế này? | 9 ADR | mỗi quyết định kỹ thuật |
| [`../.env.example`](../.env.example) | cần biến nào để chạy được dự án này? | ⚪ chưa áp dụng | code đọc một biến mới (process.env.X / os.getenv / os.Gete… |
<!-- END:auto -->

🔴 chưa điền · 🟡 một phần · 🟢 đủ · ⚪ chưa áp dụng

Bảng trên được sinh lại từ dòng `**Trạng thái:**` trong header của từng file, ở đầu mỗi phiên và cuối mỗi phiên. **File là nguồn đúng** — muốn đổi trạng thái thì sửa header của file đó, đừng sửa bảng.

## Quy ước ID — truy vết bằng `grep`, không bằng trí nhớ

| Tiền tố | Nghĩa | Nguồn |
| --- | --- | --- |
| `US-01` | luồng người dùng | [`01-product/journeys.md`](01-product/journeys.md) |
| `FR-01` | chức năng | [`02-requirements/scope.md`](02-requirements/scope.md) |
| `NFR-PERF-01` | ngưỡng phi chức năng | [`02-requirements/nfr.md`](02-requirements/nfr.md) |
| `ADR-0001` | quyết định kỹ thuật | [`decisions/`](decisions/README.md) |

- ID **không tái dùng, không xoá**. Bỏ một mục thì đổi trạng thái thành `(bỏ)`, giữ số.
- Tài liệu thiết kế của feature, commit message và test **tham chiếu ID**, không chép nội dung sang.
- Truy vết một yêu cầu: `grep -rn "NFR-PERF-01" .`
- Một ID được nhắc ở đâu đó mà không có trong file nguồn sẽ bị `docs-regen.sh` báo là ID mồ côi.
