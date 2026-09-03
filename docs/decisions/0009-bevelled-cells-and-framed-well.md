# ADR-0009 · Ô bàn chơi có vát cạnh, ghost là đường viền, bàn chơi nằm trong khung well

> **Ngày:** 2026-09-03
> **Trạng thái:** accepted
> **Liên quan:** FR-01 · FR-06 · FR-26 · NFR-PERF-01 · NFR-PERF-03 · NFR-A11Y-06 · ADR-0008

## 1. Bối cảnh

Mockup đầu tiên của `core-gameplay` vẽ mỗi ô là một hình chữ nhật màu **phẳng**, cách
nhau đúng 1px đường lưới `rgba(255,255,255,0.06)`, và bàn chơi không có khung. Người
dùng xem xong nói ngay là khó nhìn: "không có độ bóng hay khung phân biệt".

Đó là hệ quả của việc áp `MASTER.md` §5 ("elevation bằng độ sáng, không dùng shadow —
chỉ một shadow token cho modal") lên cả **ô bàn chơi**. Luật đó viết cho chrome. Áp
lên bàn chơi thì hai ô cùng màu nằm cạnh nhau dính thành một hình, và số đo ở ADR-0008
cho thấy màu **không** tự tách được: T vs Z chỉ **1.20:1**, S vs O **1.25:1**. Đường
lưới 6% trắng cũng không đủ, và `rgba(255,255,255,0.06)` làm nền khung khiến bàn chơi
gần như không tách khỏi nền trang `#0E0F13`.

## 2. Quyết định

Mọi ô đã chốt và ô của khối đang rơi được **vát cạnh**: viền sáng
`rgba(255,255,255,0.34)` ở trên-trái, viền tối `rgba(0,0,0,0.34)` ở dưới-phải, dày 2px
với ô ≥20px và 1px với ô nhỏ hơn. **Ghost đổi từ ô tô mờ thành đường viền** 2px. Bàn
chơi nằm trong một **khung well**: nền `#0A0B0E`, viền 1px `rgba(255,255,255,0.14)`,
recess `inset 0 2px 10px rgba(0,0,0,0.55)`, padding 6px trước lưới. Đường lưới lên
`rgba(255,255,255,0.09)`. §5 của `MASTER.md` được giới hạn lại: **chỉ áp cho chrome**.

**Bắt buộc khi hiện thực:** không vẽ 3 lệnh cho mỗi ô mỗi frame. Pre-render 7 sprite ô
đã vát cạnh (mỗi hue một cái, cộng ghost) vào một canvas ngoài màn hình **một lần** khi
cell size đổi, rồi mỗi frame chỉ `drawImage` một lệnh cho mỗi ô.

## 3. Phương án đã loại

| Phương án | Vì sao loại |
| --- | --- |
| Giữ ô phẳng, chỉ tăng đường lưới lên 20–30% trắng | Tách được ô nhưng biến bàn chơi thành cái lưới kẻ đậm — lưới trở thành thứ nổi nhất trên màn hình, đúng cái ngược với ADR-0008 §1 |
| Viền 1px cùng màu nhưng tối hơn quanh mỗi ô | Tách được ô cạnh nhau, nhưng ô vẫn phẳng nên vẫn không có "khối", và với ô 24px thì viền ăn mất 8% diện tích màu |
| Cho 7 hue chênh nhau về độ sáng để tự tách | Đã đo ở ADR-0008: bảy hue trên một nền tối **không thể** cùng phân biệt lẫn nhau. Sửa hex không giải được |
| Vát cạnh bằng gradient thay vì hai inset shadow | Gradient trên 200 ô đắt hơn hẳn khi vẽ trên canvas, và không sắc nét ở cạnh 1–2px |
| Vẽ 3 lệnh mỗi ô mỗi frame | 200 ô × 3 = 600 lệnh/frame thay vì 200, ăn vào ngân sách 8ms của `NFR-PERF-01` mà không cần thiết — sprite pre-render cho cùng kết quả với 1 lệnh |

## 4. Hệ quả

**Được:**
- Mỗi ô đọc ra là một khối có cạnh, không phải một vùng màu.
- Vát cạnh hoạt động **khi bỏ qua màu**, nên nó cộng thêm vào `FR-26` / `NFR-A11Y-06`
  chứ không chỉ là thẩm mỹ.
- Ghost dạng viền không còn bị nhầm với ô đã chốt (`FR-06`).
- Bàn chơi tách rõ khỏi nền trang.

**Mất / phải chấp nhận:**
- `MASTER.md` §5 mất tính tuyệt đối: giờ có một ngoại lệ, và ngoại lệ nào cũng là chỗ
  người sau có thể nới thêm. Ranh giới được ghi rõ là **chrome vs content**.
- Thêm một bước pre-render sprite phải chạy lại mỗi khi cell size đổi (resize, đổi
  bề rộng) — thêm một chỗ có thể quên, và quên thì ô bị mờ trên màn hình DPR cao.
- Vát cạnh 34% trắng làm màu ô sáng hơn ở cạnh, nên các số đo tương phản ở ADR-0008
  đo trên **thân** ô vẫn đúng, còn cạnh thì sáng hơn — không làm sai ngưỡng nào, nhưng
  phải đo lại nếu sau này đổi độ đậm vát cạnh.

**Điều kiện xem lại quyết định này:** nếu đo thấy `drawImage` cho 200 sprite vẫn vượt
ngân sách frame, hoặc nếu người chơi thật cho biết vát cạnh làm rối mắt ở cấp độ cao.
