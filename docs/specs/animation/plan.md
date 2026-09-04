# Kế hoạch thi hành · `animation`

**Liên quan:** [`design.md`](design.md) · FR-35 → FR-40 · US-01

- [x] **1.** `loop.ts`: tính `alpha` và truyền vào `draw(alpha)`; cập nhật test loop.
- [x] **2.** `render/effects.ts` + test: bộ nhớ thị giác, đồng hồ, reduced-motion
  qua `matchMedia` có lắng nghe thay đổi, không cấp phát trong `advance`.
- [x] **3.** `render/canvas.ts`: nội suy vị trí khối (FR-35, FR-36) + snap khi đổi khối.
- [x] **4.** FR-37 nháy sáng khi chốt · FR-38 vệt hard drop.
- [x] **5.** FR-39 xoá hàng: 80ms nháy trắng rồi 220ms các hàng trên trượt xuống,
  suy từ `clearTimer` chứ không thêm state.
- [x] **6.** FR-40 rung khi Tetris, biên độ ≤4px, dịch điểm vẽ chứ không resize canvas.
- [x] **7.** HUD: nháy khi lên cấp + điểm đếm tăng dần (React, ngoài canvas).
- [x] **8.** `architecture.md` §3 sửa ranh giới `render/` + ADR-0012.
- [x] **9.** `scope.md` FR-35→FR-40 · `nfr.md` nếu cần · `MASTER.md` §8 nếu thông số lệch.
- [x] **10.** Test xanh · typecheck · build · xem app thật ở 375/768/1440 · README §Features.
- [ ] **11.** Commit, PR, merge, dọn worktree.
