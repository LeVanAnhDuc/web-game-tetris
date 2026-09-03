# ADR-0004 · Đặt storage và identity sau interface async, hoãn tích hợp Ducker ID

> **Ngày:** 2026-09-03
> **Trạng thái:** accepted
> **Liên quan:** FR-30 · FR-32 · FR-34 · NFR-REL-02 · NFR-REL-03 · ADR-0002

## 1. Bối cảnh

Bản đầu là client-only: điểm cao, thiết lập và replay nằm trong `localStorage`. Nhưng
định hướng đã rõ — về sau đăng nhập sẽ đi qua **Ducker ID**, IdP của ecosystem, và
điểm cao sẽ đẩy lên server. Kiểm tra thực tế tại thời điểm này: `CLAUDE.md` của
workspace ghi rằng Ducker ID **chưa expose** `/oauth/authorize`, `/oauth/token` hay
JWKS; nó chỉ lưu OAuth client metadata trên registry entry. Cả ba sản phẩm gen-1 vẫn
tự giữ user model riêng. Nghĩa là hôm nay **không có gì để tích hợp**, kể cả nếu muốn.

## 2. Quyết định

Định nghĩa `SettingsRepository`, `ScoreRepository` và `IdentityProvider` là interface
ngay từ đầu, mỗi cái có đúng **một** implementation: `localStorage` và `LocalIdentity`
(chỉ nickname). Mọi method trả `Promise` **kể cả khi `localStorage` là đồng bộ**.
Không viết `DuckerIdIdentity` rỗng, không thêm biến môi trường OAuth, không thêm nút
"Đăng nhập" chưa hoạt động. Dữ liệu thiết lập mang `schemaVersion` và được migrate khi
đọc (FR-30).

## 3. Phương án đã loại

| Phương án | Vì sao loại |
| --- | --- |
| Gọi `localStorage` trực tiếp từ component | Cắm nguồn dữ liệu thứ hai về sau phải sửa mọi component; và không test được nhánh storage bị chặn (NFR-REL-03) |
| Interface đồng bộ, đổi sang async khi cần | Đổi một hàm sync thành async là sửa mọi call site và mọi component gọi nó. Trả `Promise` ngay từ đầu tốn vài chữ `await` |
| Viết sẵn `DuckerIdIdentity` + cấu hình OAuth | Không có endpoint nào để gọi. Code chết không chạy được là code sai mà không ai biết |
| Chờ Ducker ID xong rồi mới làm game | Phụ thuộc vào một sản phẩm khác cho một game chơi một mình không cần đăng nhập |

## 4. Hệ quả

**Được:**
- Thêm `DuckerIdIdentity` và `RemoteScoreRepository` về sau là thêm file, không sửa `ui/`.
- Nhánh lỗi storage (hỏng, bị chặn, hết quota) test được vì có chỗ để thay implementation.
- `engine/` không bao giờ nhìn thấy storage — giữ được ADR-0002.

**Mất / phải chấp nhận:**
- Ba interface với đúng một implementation nhìn như abstraction thừa. Người đọc code
  mà không đọc ADR này sẽ muốn gỡ chúng ra — đó chính là lý do ADR này tồn tại.
- `await` cho một phép đọc đồng bộ khiến vài hàm khởi tạo thành async.

**Điều kiện xem lại quyết định này:** khi Ducker ID có `/oauth/authorize`,
`/oauth/token` và JWKS thật — lúc đó viết ADR mới cho luồng đăng nhập, và mở lại mục
Data & Privacy trong `nfr.md`.
