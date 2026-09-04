# Thiết kế · `settings`

**Liên quan:** FR-17 · FR-23 → FR-30 · FR-42 → FR-44 · US-02 · NFR-REL-02 ·
NFR-REL-03 · NFR-A11Y-02 · NFR-I18N-04 · ADR-0004 · ADR-0013

## 1. Ba gói trong một branch

Thứ tự đã chốt là A → B → C+D. A (animation) đã merge riêng. B (settings + lưu trữ),
C (âm thanh) và D (độ khó + tốc độ) nằm chung branch này vì **C và D không tồn tại
được nếu không có B** — không có màn Settings thì không có chỗ bật/tắt âm thanh hay
chọn độ khó. Ba commit riêng, một PR.

## 2. Ranh giới

```
ui/SettingsScreen ──► settings/ (context) ──► storage/ (async, ADR-0004)
                           │
                           ├─ settingsToConfig() ──► engine Config  (áp ở lượt sau)
                           ├─ ghost · colorBlind ──► render options (áp ngay)
                           ├─ smoothHorizontal   ──► effects        (áp ngay)
                           └─ sound · volume     ──► audio/         (áp ngay)
```

`engine/` **không biết `settings/` tồn tại**. Nó chỉ nhận `Config`, như trước.

## 3. Cái gì áp ngay, cái gì đợi lượt sau

| Áp ngay | Đợi lượt sau |
| --- | --- |
| âm thanh · âm lượng · ghost · chế độ không màu · nội suy ngang · ngôn ngữ | độ khó · tốc độ tự đặt · DAS · ARR · keybind |

Cột phải là `Config` của engine hoặc listener bàn phím. Đổi giữa lượt sẽ khiến replay
mô tả một ván chưa từng xảy ra (ADR-0013).

## 4. Storage

`schemaVersion` + `migrateSettings` kiểm từng trường, kẹp giá trị, và **rơi về mặc
định** khi gặp rác — không rơi về cực trị. Ba trạng thái trả về: `ok`, `recovered`
(đọc được nhưng không nguyên vẹn), `unavailable` (bị chặn hoặc hết quota). Hai trạng
thái sau **hiện lên UI**, không nuốt.

## 5. Âm thanh

Tự sinh bằng Web Audio, không dùng file: §Non-Goals cấm nhạc có bản quyền và trần chi
phí là 0đ. `AudioContext` chỉ tạo ở âm thanh đầu tiên — trình duyệt từ chối tạo một
context trước cử chỉ người dùng. Không có Web Audio, hoặc tạo context ném lỗi: im
lặng, game vẫn chạy.

T-spin có âm riêng, vì số hàng xoá không nói được rằng đó là T-spin.

## 6. Chế độ không phụ thuộc màu (FR-26)

Ô đổi sang một màu xám chung và mang **ký tự của loại khối**. ADR-0008 đã đo T vs Z ở
**1.20:1** — với người không phân biệt được hai màu đó, chúng là **cùng một khối**.
Nên đây không phải tuỳ chọn thẩm mỹ, nó là chế độ làm game chơi được.

## 7. Test

- `storage`: rác, nửa hỏng, giá trị vượt biên, binding của action đã biến mất, schema
  cũ, storage bị chặn, storage ném lỗi ở mọi lần gọi.
- `audio`: câm khi tắt, T-spin khác âm với xoá thường, không tạo context trước âm đầu
  tiên, không có Web Audio thì không ném.
- `timing`: preset nhân đúng cả đường cong, tốc độ tự đặt thay hẳn đường cong, soft
  drop luôn nhanh hơn gravity đang có hiệu lực.
