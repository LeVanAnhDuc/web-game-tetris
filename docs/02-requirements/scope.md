# Danh mục chức năng

> **Trả lời:** Hệ thống có những chức năng nào, mỗi cái đang ở trạng thái gì?
> **Trạng thái:** 🟢 đủ
> **Cập nhật:** 2026-09-03 · commit d171af7
> **Cập nhật khi:** brainstorm ra chức năng mới (cấp FR mới) · một FR chuyển trạng thái

<!-- CÁCH ĐIỀN
Chỉ LIỆT KÊ. Một dòng một chức năng, tên ngắn. Cách làm thuộc tài liệu thiết kế
của feature, không thuộc đây.

ID cấp tăng dần, không tái dùng, không xoá. Bỏ một chức năng thì đổi trạng thái
thành (bỏ) và giữ số — vì commit và test cũ vẫn tham chiếu ID đó.

Trạng thái: chưa · đang · xong · (bỏ)

KHÔNG chứa: cách hiện thực, ngưỡng phi chức năng (-> nfr.md), lý do chọn giải pháp
(-> decisions/).
-->

| ID | Chức năng | Thuộc luồng | Trạng thái |
| --- | --- | --- | --- |
| FR-01 | Bàn chơi 10×20 kèm vùng đệm trên đỉnh, kiểm tra chồng lấn | US-01 | xong |
| FR-02 | Xoay khối theo SRS kèm wall kick | US-01 | xong |
| FR-03 | Sinh khối theo 7-bag | US-01 | xong |
| FR-04 | Hàng chờ 5 khối kế tiếp | US-01 | xong |
| FR-05 | Giữ khối (hold), một lần cho mỗi khối | US-01 | xong |
| FR-06 | Hình bóng chỗ khối sẽ đáp (ghost) | US-01 | xong |
| FR-07 | Thả chậm (soft drop) và thả tức thì (hard drop) | US-01 | xong |
| FR-08 | Tốc độ rơi tăng theo cấp độ | US-01 | xong |
| FR-09 | Lock delay kèm move reset, giới hạn 15 lần | US-01 | xong |
| FR-10 | Xoá hàng và tính điểm cơ bản | US-01 | xong |
| FR-11 | Tăng cấp độ theo số hàng đã xoá | US-01 | xong |
| FR-12 | Kết thúc lượt khi chồng tới đỉnh (block out / lock out) | US-01 | xong |
| FR-13 | Tạm dừng và tiếp tục lượt chơi | US-01 | xong |
| FR-14 | Tự tạm dừng khi tab mất focus | US-01 | xong |
| FR-15 | Điều khiển bàn phím có DAS/ARR | US-01 | xong |
| FR-16 | Điều khiển cảm ứng trên màn hình nhỏ | US-01 | xong |
| FR-17 | Hiệu ứng âm thanh | US-01 | chưa — dồn sang feature 3 cùng FR-27 (âm lượng) |
| FR-18 | Ghi lại replay của lượt chơi (seed + chuỗi lệnh) | US-01 | xong |
| FR-19 | Nhận diện T-spin và T-spin mini | US-01 | xong |
| FR-20 | Combo | US-01 | xong |
| FR-21 | Back-to-back | US-01 | xong |
| FR-22 | Perfect clear | US-01 | xong |
| FR-23 | Đổi phím cho từng hành động | US-02 | chưa |
| FR-24 | Điều chỉnh DAS và ARR | US-02 | chưa |
| FR-25 | Bật/tắt hình bóng điểm đáp | US-02 | chưa |
| FR-26 | Chế độ phân biệt khối không dựa vào màu | US-02 | chưa |
| FR-27 | Điều chỉnh âm lượng | US-02 | chưa |
| FR-28 | Đổi ngôn ngữ giao diện EN/VI, đoán mặc định từ trình duyệt | US-02 | chưa |
| FR-29 | Khôi phục thiết lập về mặc định | US-02 | chưa |
| FR-30 | Lưu thiết lập kèm phiên bản schema và migration | US-02 | chưa |
| FR-31 | Bảng chỉ số cuối lượt (điểm, hàng, cấp độ, thời gian, PPS) | US-03 | xong |
| FR-32 | Điểm cao cục bộ theo từng chế độ | US-03 | chưa |
| FR-33 | Hiển thị thời điểm đạt điểm theo locale đang chọn | US-03 | chưa |
| FR-34 | Định danh cục bộ bằng nickname | US-03 | chưa |
