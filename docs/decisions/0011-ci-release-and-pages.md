# ADR-0011 · CI, release tự động từ commit, và deploy Pages

> **Ngày:** 2026-09-04
> **Trạng thái:** accepted
> **Liên quan:** NFR-PERF-04 · NFR-SEC-02 · ADR-0001

## 1. Bối cảnh

Repo đã có code chạy được nhưng chưa có gì tự động: PR merge được khi test đỏ, không
ai biết bản nào đang chạy, và Pages chưa bật. Trong workspace có tiền lệ gần nhất là
`web-app-calculate-badminton` (repo `app-calculate-badminton`) — đã chạy tới `v1.13.2`
với hai workflow: `release.yml` tự tính version từ tiền tố Conventional Commit, và
`deploy.yml` build rồi đẩy lên Pages. Cơ chế đó hoạt động thật trong nhiều tháng, nên
điểm khởi đầu là sao chép nó chứ không phải tự nghĩ lại.

## 2. Quyết định

Ba workflow: `ci.yml` (mọi pull request: `npm ci` · `npm test` · `npm run build`),
`deploy.yml` (push `main` → Pages), `release.yml` (push `main` → tạo release).

Logic version và logic soạn notes nằm trong **hai script bash dưới
`.github/scripts/`**, không inline trong YAML, để **chạy thử được tại máy** trước khi
ai đó tin vào nó. Version tính từ toàn khoảng kể từ tag trước; notes soạn từ **subject
của commit, nhóm theo type**, breaking change lên đầu.

Bốn chỗ khác badminton, mỗi chỗ một lý do:

1. **Release đầu là `v0.1.0`**, không phải `v1.0.0`, và **trên 0.x thì breaking change
   bump MINOR**. Chỉ marker `[release major]` mới sang được `1.0.0`.
2. **`^BREAKING CHANGE` được neo đầu dòng.** Badminton grep chuỗi đó ở bất kỳ đâu
   trong body; commit body của dự án này dài và bàn thẳng về breaking change, nên
   không neo là tự bump major khi chỉ đang *viết về* nó.
3. **Notes soạn tay từ commit, không dùng `--generate-notes`.** Release mới nhất của
   badminton, `v1.13.2`, có body đúng một dòng "Full Changelog" — vì `--generate-notes`
   liệt kê pull request đã merge, mà push đó là commit trực tiếp.
4. **Không có biến `GITHUB_PAGES`.** Badminton phải đặt `base:` theo tên repo;
   dự án này dùng `base: './'` nên cùng một bản build chạy được ở cả root domain và
   subpath của Pages. Đó cũng là lý do `.env.example` nói dự án không đọc biến môi
   trường nào — và điều đó vẫn đúng sau ADR này.

Thêm một thứ badminton không có: **`release.yml` chạy lại test và build trước khi
tag.** Một tag là vĩnh viễn và người đọc hiểu nó là "bản này chạy được".

## 3. Phương án đã loại

| Phương án | Vì sao loại |
| --- | --- |
| `semantic-release` / `standard-version` | Thêm một dependency và một file cấu hình để làm đúng việc mà 80 dòng bash đang làm, và bash thì đọc được toàn bộ trong một lần đọc |
| Giữ logic inline trong YAML như badminton | Không chạy thử được tại máy. Logic version có 6 nhánh và tôi đã tìm ra lỗi ở nhánh 0.x **bằng cách chạy nó**, việc không làm được nếu nó nằm trong YAML |
| `--generate-notes` của `gh` | Chỉ liệt kê PR. Push commit trực tiếp thì notes rỗng — xem `v1.13.2` của badminton |
| `workflow_run` để release chờ deploy xong | Đúng về thứ tự nhưng thêm ràng buộc token và branch; chạy lại test ngay trong `release.yml` cho cùng bảo đảm với ít phần chuyển động hơn |
| Chặn cứng bundle size trong CI | `NFR-PERF-04` là 200KB và build đang ở 71.5KB — một cổng chặn chỉ nổ khi có sai sót mà log đã in ra. In số, chưa chặn |
| Bỏ `ci.yml`, chỉ chạy test lúc push `main` như badminton | PR merge được khi đang đỏ, và chỗ đầu tiên phát hiện là job deploy — tức là sau khi đã merge |

## 4. Hệ quả

**Được:**
- Mỗi push `main` cho một version và một trang đã deploy, không cần ai bấm gì.
- Notes nói đúng những gì đã thay đổi, kể cả khi push không qua PR.
- Tag không bao giờ trỏ vào commit đỏ.
- Hai script chạy được tại máy nên "release sẽ ghi gì" là câu trả lời được trước.

**Mất / phải chấp nhận:**
- **Commit subject trở thành API.** Gõ sai tiền tố là version sai, và không có gì báo.
  Đây là cái giá của mọi cơ chế kiểu này, kể cả `semantic-release`.
- Test chạy hai lần trên mỗi push `main` (một lần ở `deploy.yml`, một lần ở
  `release.yml`). Đổi lấy việc tag không trỏ vào bản đỏ.
- Hai script bash là code phải tự bảo trì, và chúng không có test tự động — chúng
  được kiểm bằng cách chạy tay qua 6 tình huống, ghi trong PR.
- Push `main` mà không có commit nào theo convention sẽ ra một bản patch với notes
  nằm ở mục "Other". Cố ý: notes âm thầm bỏ commit tệ hơn notes có một mục lộn xộn.

**Điều kiện xem lại quyết định này:** nếu cần changelog dạng file trong repo, hoặc
nếu số workflow vượt quá mức đọc hết trong một lần — lúc đó `semantic-release` mới
đáng cái giá của nó.
