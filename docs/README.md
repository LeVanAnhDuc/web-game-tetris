# Tài liệu dự án `web-game/web-game-tetris`

## Bản đồ

<!-- BEGIN:auto — bảng dưới do .claude/scripts/docs-regen.sh sinh từ header của từng file. Đừng sửa tay. -->
| File | Trả lời câu hỏi | Trạng thái | Cập nhật khi |
| --- | --- | --- | --- |
| [`01-product/overview.md`](01-product/overview.md) | Sản phẩm này là gì, cho ai, và **KHÔNG** làm gì? | 🔴 chưa điền | định vị đổi · thêm/bớt một Non-Goal · trần chi phí đổi |
| [`01-product/journeys.md`](01-product/journeys.md) | Người dùng đi qua những luồng nào từ đầu đến cuối? | 🔴 chưa điền | có luồng người dùng mới · một luồng cũ đổi bản chất |
| [`01-product/glossary.md`](01-product/glossary.md) | Khái niệm này gọi là gì trong code, và hiện ra sao trên UI… | ⚪ chưa áp dụng | xuất hiện một khái niệm nghiệp vụ mới trong code hoặc UI |
| [`02-requirements/scope.md`](02-requirements/scope.md) | Hệ thống có những chức năng nào, mỗi cái đang ở trạng thái… | 🔴 chưa điền | brainstorm ra chức năng mới (cấp FR mới) · một FR chuyển t… |
| [`02-requirements/nfr.md`](02-requirements/nfr.md) | Ngưỡng nào áp cho **mọi** feature, để không phải nhắc lại … | 🟡 mặc định đề xuất, chưa rà theo dự án | thêm loại tài nguyên mới · thêm nhóm người dùng · sau sự c… |
| [`03-design/architecture.md`](03-design/architecture.md) | Hệ thống ghép lại thế nào, ranh giới giữa các phần ở đâu? | 🔴 chưa điền | thêm/bỏ một module hoặc service · đổi cách hai module nói … |
| [`03-design/invariants.md`](03-design/invariants.md) | Sửa gì thì hệ thống sai **âm thầm** — test vẫn xanh mà kết… | 🟡 mặc định đề xuất, chưa rà theo dự án | phát hiện một bất biến mới — thường là ngay sau khi ai đó … |
| [`04-state/backlog.md`](04-state/backlog.md) | Đang làm gì, tiếp theo làm gì, và đang nợ những gì? | 🔴 chưa điền | bắt đầu/kết thúc một việc · brainstorm ra việc mới · cố ý … |
| [`decisions/`](decisions/README.md) | Tại sao lại làm thế này? | 0 ADR | mỗi quyết định kỹ thuật |
| [`../.env.example`](../.env.example) | cần biến nào để chạy được dự án này? | 🔴 chưa điền | code đọc một biến mới (process.env.X / os.getenv / os.Gete… |
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
