# Luồng người dùng

> **Trả lời:** Người dùng đi qua những luồng nào từ đầu đến cuối?
> **Trạng thái:** 🟢 đủ
> **Cập nhật:** 2026-09-03 · commit 0010a0f
> **Cập nhật khi:** có luồng người dùng mới · một luồng cũ đổi bản chất

<!-- CÁCH ĐIỀN
Viết bằng NGÔN NGỮ NGƯỜI DÙNG. Không có tên bảng, tên endpoint, tên component ở đây.
Mỗi luồng một mục, ID tăng dần US-01, US-02... không tái dùng số.

Mục "Điều gì có thể sai" là mục có giá trị nhất — nó là nguồn của test case và của
các trạng thái lỗi trên UI. Bỏ trống mục đó thì AI sẽ chỉ hiện thực đường đi đẹp.

KHÔNG chứa: chi tiết bố cục UI, danh mục chức năng (-> 02-requirements/scope.md).
-->

## US-01 · Chơi một lượt Marathon

**Bối cảnh:** Người chơi mở trang lần đầu, chưa cài gì, chưa đăng nhập gì. Có thể
đang ở desktop với bàn phím, hoặc đang cầm điện thoại.

**Các bước:**
1. Mở trang. Thấy ngay được bàn chơi và một cách bắt đầu; không bị chắn bởi màn hình
   đăng nhập hay yêu cầu nhập tên.
2. Bắt đầu lượt chơi. Khối rơi xuống, người chơi di chuyển ngang, xoay, thả nhanh.
3. Nhìn hàng chờ khối kế tiếp để dựng thế; giữ một khối lại dùng sau khi cần.
4. Xếp đầy hàng ngang, hàng biến mất, điểm và số hàng tăng.
5. Thực hiện những nước xoá hàng khó hơn — xoay khối T vào khe kín, xoá nhiều
   hàng liên tiếp nhau, dọn sạch toàn bộ bàn — và được thưởng điểm cao hơn hẳn
   so với xoá hàng thường.
6. Chơi càng lâu thì khối rơi càng nhanh.
7. Tạm dừng giữa lượt nếu cần, rồi chơi tiếp đúng chỗ đã dừng.
8. Khối chồng tới đỉnh — lượt chơi kết thúc, thấy kết quả của lượt vừa rồi.

**Kết quả mong đợi:** Người chơi thấy điểm, số hàng đã xoá và cấp độ đạt được của
lượt vừa xong, cùng lựa chọn chơi lại ngay. Nếu đó là điểm cao nhất từ trước tới nay
trên máy này, họ được cho biết. Kết quả lượt chơi được ghi lại trên máy họ.

**Điều gì có thể sai:**
- Người chơi chuyển sang tab khác giữa lượt — quay lại thấy đã chết vì khối vẫn rơi
  trong lúc không ai nhìn. Phải tự tạm dừng khi mất focus.
- Máy có màn hình tần số quét cao — khối rơi nhanh gấp đôi so với người dùng màn
  hình thường, tức là hai người đang chơi hai game khác nhau.
- Giữ phím sang trái quá lâu ở tốc độ cao làm khối vượt quá ô định nhắm.
- Xoay khối khi sát tường hoặc sát khối khác: người chơi kỳ vọng khối "lách" vào
  được như các bản Tetris hiện đại. Nếu bị chặn, họ kết luận game sai luật.
- Trên điện thoại: nút bấm che mất phần bàn chơi, hoặc bấm nhầm vì vùng bấm quá nhỏ.
- Trình duyệt ở chế độ riêng tư hoặc hết dung lượng lưu trữ — không lưu được kết quả.
  Lượt chơi vẫn phải chơi được trọn vẹn, chỉ là không lưu.
- Người chơi bị mù màu không phân biệt được các loại khối nếu màu là dấu hiệu duy nhất.

**Chức năng liên quan:** FR-01 → FR-22

---

## US-02 · Tinh chỉnh điều khiển và ngôn ngữ

**Bối cảnh:** Người chơi đã chơi vài lượt và thấy tay không khớp: phím không đúng
thói quen, hoặc di chuyển ngang quá chậm/quá nhạy. Cũng có thể họ muốn đọc giao diện
bằng tiếng còn lại.

**Các bước:**
1. Vào phần cài đặt từ màn hình chính hoặc từ lúc đang tạm dừng.
2. Đổi phím cho từng hành động bằng cách bấm trực tiếp phím muốn dùng.
3. Điều chỉnh độ trễ trước khi khối tự chạy ngang, và tốc độ chạy ngang đó.
4. Bật/tắt hình bóng chỉ chỗ khối sẽ đáp, bật chế độ phân biệt khối không dựa vào
   màu, đổi âm lượng, đổi ngôn ngữ giao diện.
5. Quay lại chơi. Thiết lập có hiệu lực ngay và vẫn còn ở lần mở trang sau.

**Kết quả mong đợi:** Thiết lập được lưu trên máy người chơi và áp dụng ngay không
cần tải lại trang. Ngôn ngữ mặc định đoán theo ngôn ngữ trình duyệt ở lần đầu.

**Điều gì có thể sai:**
- Người chơi gán một phím đã dùng cho hành động khác — phải cho biết trước, không im
  lặng ghi đè rồi để họ mất một hành động.
- Người chơi gán phím mà trình duyệt giữ riêng (ví dụ phím tab), hoặc gán xong tự
  khoá mình khỏi việc thoát cài đặt.
- Đặt tốc độ chạy ngang về mức cực đoan làm game không chơi được, rồi không biết
  đường quay lại — cần một cách phục hồi về mặc định.
- Bản lưu thiết lập từ phiên bản cũ thiếu hành động mới thêm — không được crash, và
  không được xoá sạch thiết lập cũ của người chơi.
- Đổi ngôn ngữ nhưng vài chỗ vẫn còn tiếng cũ vì chuỗi bị viết thẳng trong code.

**Chức năng liên quan:** FR-23 → FR-30

---

## US-03 · Xem thống kê và điểm cao

**Bối cảnh:** Người chơi vừa kết thúc một lượt, hoặc mở lại trang sau vài ngày và
muốn biết mình đã làm được tới đâu.

**Các bước:**
1. Sau khi kết thúc lượt, xem bảng chỉ số của chính lượt đó.
2. Mở phần điểm cao để so với các lượt trước trên máy này.
3. Chọn chơi lại.

**Kết quả mong đợi:** Thấy điểm, số hàng, cấp độ, thời gian chơi và tốc độ đặt khối
của lượt vừa rồi; thấy danh sách điểm cao nhất đã lưu kèm thời điểm đạt được, định
dạng theo ngôn ngữ đang chọn.

**Điều gì có thể sai:**
- Chưa có lượt nào được lưu — danh sách trống phải nói rõ là chưa có, không phải hiện
  một bảng trắng khiến người chơi tưởng bị lỗi.
- Dữ liệu lưu trên máy bị hỏng hoặc do phiên bản cũ ghi — phải mở được trang với
  danh sách trống, không trắng màn hình.
- Người chơi xoá dữ liệu trình duyệt và mất hết điểm cao mà không được cảnh báo
  trước rằng điểm chỉ nằm trên máy này, không nằm trên bất kỳ máy chủ nào.
- Người chơi kỳ vọng so điểm với người khác — hiện chưa có, và không nên gợi ý là có.

**Chức năng liên quan:** FR-31 → FR-34
