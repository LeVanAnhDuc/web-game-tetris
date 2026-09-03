# Tổng quan sản phẩm

> **Trả lời:** Sản phẩm này là gì, cho ai, và **KHÔNG** làm gì?
> **Trạng thái:** 🟢 đủ
> **Cập nhật:** 2026-09-03 · commit 0010a0f
> **Cập nhật khi:** định vị đổi · thêm/bớt một Non-Goal · trần chi phí đổi

<!-- CÁCH ĐIỀN
File này là nơi DUY NHẤT trả lời "cái này có thuộc phạm vi không". Mọi tranh luận
về scope kết thúc ở đây.

Mục 4 (Non-Goals) là mục quan trọng nhất và là mục dễ bỏ trống nhất. Một Non-Goal
tốt là thứ nghe HỢP LÝ mà vẫn bị từ chối — "không làm chat realtime", "không hỗ trợ
nhiều tổ chức". Nếu danh sách Non-Goals trống, file này chưa làm được việc của nó.

KHÔNG chứa: danh sách tính năng (-> 02-requirements/scope.md), ngưỡng kỹ thuật
(-> 02-requirements/nfr.md), thuật ngữ (-> 01-product/glossary.md).
-->

## 1. Một câu định vị

Tetris đúng chuẩn Modern Guideline chạy hoàn toàn trong browser, cho người chơi đã
quen cảm giác điều khiển của Tetr.io/Jstris — không cài đặt, không đăng nhập, không
cần mạng sau lần tải đầu.

## 2. Vấn đề đang giải

Một người chơi đã hình thành phản xạ theo chuẩn hiện đại thì **sai một chi tiết luật
là chơi không được** — thiếu wall kick thì nước xoay vào khe quen thuộc bị chặn,
thiếu lock delay thì không kịp chỉnh, DAS/ARR cố định thì tốc độ di chuyển ngang
không khớp tay. Đây không phải chuyện "thiếu tính năng" mà là chuyện game phản hồi
sai so với thứ người chơi đã học. Ràng buộc kèm theo: người chơi muốn mở ra chơi
ngay, không muốn tạo tài khoản để được chơi một mình.

## 3. Người dùng mục tiêu

**Nhóm chính:** người chơi đã biết chuẩn hiện đại (hold, ghost, 7-bag, T-spin), chơi
trên desktop bằng bàn phím, quan tâm tới việc tinh chỉnh DAS/ARR và keybind.

**Nhóm phụ:** người chơi tình cờ mở trên điện thoại. Phải chơi được đầy đủ luật bằng
cảm ứng, nhưng không phải là nhóm được tối ưu cho tốc độ.

## 4. Non-Goals — dứt khoát không làm

- **Không multiplayer đối kháng.** Garbage lines qua mạng đòi realtime, server
  authoritative và xử lý lag — đắt hơn toàn bộ phần game cộng lại.
- **Không leaderboard server, không backend.** Trần chi phí là 0đ/tháng (mục 5), và
  một bảng xếp hạng online mà không chống được gian lận điểm thì tệ hơn là không có.
- **Không hệ thống tài khoản riêng của game.** Khi cần định danh, nó sẽ đi qua Ducker
  ID của ecosystem — dựng thêm một bảng user thứ hai là đi ngược hướng đó (ADR-0004).
- **Không tối ưu thi đấu tốc độ trên mobile.** Cảm ứng chơi đủ luật, nhưng mọi đánh
  đổi giữa hai nhóm sẽ nghiêng về bàn phím.
- **Không các mode biến thể** (Puzzle, Cheese, Zen, Battle với AI). Sprint 40L và
  Ultra 2 phút **không** nằm ở đây — chúng dùng chung engine nên ở `backlog.md`.
- **Không nhạc nền.** Chỉ hiệu ứng âm thanh tự sinh; không mang vào bất kỳ bản nhạc
  có bản quyền, kể cả bản Tetris "quen thuộc".
- **Không phát hành app store / không native app.** Web là kênh duy nhất.

## 5. Mô hình

| Câu hỏi | Trả lời |
| --- | --- |
| Ai trả tiền | không ai — dự án học tập |
| Trả bằng gì | — |
| **Trần chi phí hạ tầng / tháng** | **0đ.** Chỉ hosting tĩnh (GitHub Pages). Ràng buộc này là lý do không có backend, không có database, và không có analytics. |

## 6. Thế nào là thành công

Ba tiêu chí dưới đây **đo được nhưng chưa được đo** — chúng là ngưỡng tự đặt, sẽ đối
chiếu sau bản build đầu tiên. Lưu ý một hệ quả của trần chi phí 0đ: **không có
analytics**, nên mọi chỉ số kiểu "bao nhiêu người quay lại sau 7 ngày" là không đo
được ở dự án này — cố viết vào đây thì chỉ là con số không ai kiểm được.

1. Toàn bộ bảng wall-kick SRS và bảng điểm được khoá bằng test đối chiếu nguồn công
   khai, và bộ test đó xanh — tức "đúng luật" là một câu kiểm được, không phải cảm nhận.
2. Giữ 60fps liên tục tới level 15 trên laptop tầm trung (đo bằng Performance panel).
3. Một người chơi mới mở lần đầu đổi được keybind và DAS/ARR trong dưới 60 giây mà
   không cần đọc hướng dẫn.
