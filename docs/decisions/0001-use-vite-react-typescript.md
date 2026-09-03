# ADR-0001 · Dùng Vite + React + TypeScript, npm, deploy tĩnh

> **Ngày:** 2026-09-03
> **Trạng thái:** accepted
> **Liên quan:** NFR-PERF-04 · NFR-PERF-05

## 1. Bối cảnh

Dự án bắt đầu từ repo trống. Trần chi phí hạ tầng là 0đ/tháng, nên chỉ hosting tĩnh
là khả thi. Phạm vi bản đầu gồm 3 màn hình thật (chơi, cài đặt, điểm cao), trong đó
màn cài đặt có keybind capture và slider — tức phần lớn công việc UI là form và danh
sách, không phải đồ hoạ. Workspace đã có tiền lệ gen-2: `web-app-calculate-badminton`
là Vite + React trên GitHub Pages, và toàn bộ gen-2 dùng **npm**, không Yarn.

## 2. Quyết định

Vite + React + TypeScript, quản lý gói bằng **npm**, test bằng Vitest, build ra file
tĩnh và deploy lên GitHub Pages. Luật chơi **không** nằm trong React — xem ADR-0002
và ADR-0003. React chỉ phụ trách điều hướng màn hình, HUD, form và bảng.

## 3. Phương án đã loại

| Phương án | Vì sao loại |
| --- | --- |
| Vite + TypeScript thuần, không framework | Bundle nhỏ nhất và zero dependency, nhưng màn cài đặt + bảng điểm viết bằng DOM tay là phần tốn công nhất của cả dự án, mà nó chiếm 2 trong 3 chức năng của bản đầu |
| React render toàn DOM, bàn chơi là 200 `div` | Vẽ lại 200 node mỗi frame là dùng sai công cụ; sai này chỉ lộ ở cấp độ cao, lúc khó sửa nhất |
| Yarn classic (theo gen-1 của workspace) | Gen-2 dùng npm; trộn hai toolchain trong một workspace đã từng làm 39 file test của badminton fail vì hoisting khác nhau |
| Next.js | Game client-only không cần SSR, routing file-based hay server component; thêm một framework để không dùng gì của nó |

## 4. Hệ quả

**Được:**
- Màn cài đặt và bảng điểm rẻ, layout responsive 375/768/1440 rẻ.
- Khớp tiền lệ gen-2 của workspace: cùng toolchain, cùng cách deploy.
- Deploy tĩnh giữ đúng trần chi phí 0đ.

**Mất / phải chấp nhận:**
- React kéo theo ~40KB gzip mà phần game không dùng tới — phải theo dõi NFR-PERF-04.
- Sinh ra một rủi ro kỷ luật: nếu ai đó để React state điều khiển vòng lặp game thì
  rớt frame. Rủi ro này được chặn bằng bất biến #3 trong `invariants.md`, không bằng
  công cụ nào.

**Điều kiện xem lại quyết định này:** nếu bundle vượt NFR-PERF-04 mà không cắt được,
hoặc nếu phần UI teo lại chỉ còn HUD thì React hết lý do tồn tại.
