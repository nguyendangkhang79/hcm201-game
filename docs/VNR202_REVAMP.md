# Phân tích và bàn giao revamp VNR202

Ngày: 30/10/2026. Phạm vi: cập nhật checkout hiện tại, giữ React/Vite/Firebase/Vercel.

> Đây là bản phân tích tại thời điểm revamp ban đầu. Quiz đã được nâng cấp lên API máy chủ, 60 câu và lưu/khôi phục bài; thông tin mới nhất nằm tại [QUIZ_SECURITY.md](QUIZ_SECURITY.md) và README. Các mốc 36 câu, chấm điểm client và chưa có xuất kết quả bên dưới mô tả phiên bản cũ.

## 1. Kết quả phân tích project cũ

| Thành phần | Hiện trạng trước cập nhật | Quyết định |
| --- | --- | --- |
| `App.jsx` | Router `/`, `/play`, `/admin`, `/live` | Giữ route cũ, thêm `/explore`, `/quiz`, `/bingo`, trang 404 |
| `Home.jsx` | Nhận diện Theo dấu chân Bác; sáu tour gắn cuộc đời Hồ Chí Minh; form tham gia Bingo | Thay trải nghiệm trang chủ và dữ liệu tham quan |
| `Player.jsx` | Xếp bảng 25 ô, kéo thả/chọn chạm, tự động xếp, sẵn sàng, phát hiện hàng Bingo, ghi hạng bằng transaction | Giữ cơ chế chơi, đổi thương hiệu, kho từ và vùng dữ liệu |
| `Admin.jsx` | PIN kiểm tra ở client, quản lý từ, phát lệnh, trạng thái ván | Giữ giao diện điều khiển, khởi tạo kho mới khi còn trống |
| `LiveDashboard.jsx` | Firebase subscriptions cho người chơi và kết quả | Giữ; đổi thương hiệu và đường dẫn |
| `Chat.jsx` | Chat Firebase dùng chung phòng | Giữ; chuyển vùng VNR202 |
| Nội dung Quiz | Chưa có | Tạo ngân hàng độc lập và engine chấm điểm |
| CSS | Nhiều stylesheet toàn cục, một số selector trùng nhau | Scope giao diện mới dưới `.history-app` để tránh tác động Bingo |
| `index.css` | Có CSS mẫu Vite, root giới hạn chiều rộng và tự đổi dark mode | Thay nền tảng tối giản, giữ font biến cho các màn hình cũ |
| Hosting | Vite static và Vercel SPA rewrite | Giữ cấu hình; không chuyển nền tảng hoặc triển khai dịch vụ mới |

Không cần viết lại toàn bộ game hoặc thêm backend cho Quiz MVP. Tự luyện cá nhân không cần lưu Firebase; Bingo tiếp tục dùng realtime như trước.

## 2. Những điểm cần hiểu đúng trong brief

1. Dinh Độc Lập/Hội trường Thống Nhất và khu vực Hội nghị Hiệp thương không được tính thành hai địa điểm riêng khi cùng một không gian lịch sử. Một card có nhiều sự kiện.
2. Hội trường Ba Đình cũ khác Nhà Quốc hội hiện nay. Card và chi tiết ghi rõ công trình gốc không còn tồn tại; dùng ảnh tư liệu.
3. Có nguồn bài viết hoặc hình ảnh không đồng nghĩa có tour 3D. Trạng thái được khai báo bằng `visit.type`: `3d`, `digital`, `info`; UI chỉ tạo liên kết tham quan khi có URL.
4. Ba Chúc được dùng như chứng tích về chiến tranh bảo vệ biên giới Tây Nam và tưởng niệm thường dân, không gắn nhãn địa điểm chiến thắng.
5. Sáu tour cũ không buộc phải đổi thành sáu tour mới chưa kiểm chứng. Hiện có bốn địa điểm; bổ sung hai điểm chỉ khi đáp ứng liên hệ giáo trình, nguồn và quyền sử dụng ảnh.
6. File brief được gửi bị ngắt ở tiêu chí cuối. Bản này hiểu yêu cầu đó là không hiện đáp án trước khi xác nhận; Challenge chỉ hiện đáp án khi kết thúc lượt.

## 3. Phần đã triển khai

- Thương hiệu Dấu ấn lịch sử Đảng, bảng màu đỏ lịch sử/vàng đồng/trắng ngà, favicon dạng sách, metadata mới.
- Trang chủ có hero, hành trình học, timeline nguồn ngoài, preview địa điểm, Quiz và Bingo.
- Khám phá có lọc theo giai đoạn, card, chi tiết sự kiện, mốc thời gian, nguồn và credit ảnh.
- Ba ảnh tải về phục vụ cục bộ từ Wikimedia Commons, ghi tác giả và liên kết giấy phép CC BY-SA trên card; hero ghi năm chụp 2013 để phân biệt ảnh trưng bày với ảnh sự kiện 1975.
- Quiz có tên người chơi, chọn kết hợp chủ đề, 10/15 câu, thanh tiến độ, một câu/lượt, bốn đáp án, chấm điểm và chơi lại.
- Tự luyện: xác nhận xong mới hiện lời giải; khóa lựa chọn để không sửa câu đã chấm.
- Thử thách: đồng hồ tính theo deadline tuyệt đối, không theo số lần interval chạy; tự kết thúc khi qua deadline, không nhận câu trả lời muộn; 100 điểm/câu đúng.
- Kết quả có tỷ lệ đúng, tổng điểm, số câu chưa làm, thời gian; xem lời giải/nguồn và lọc câu sai.
- Bingo có 36 từ khóa mới; mọi thành phần dùng cùng vùng dữ liệu VNR202. Kho mặc định đọc được cả khi chưa có trọng tài khởi tạo; transaction chỉ tạo kho nếu chưa tồn tại.

## 4. Vùng dữ liệu và hành vi migration

```text
courses/vnr202/
  gameState/
    wordList
    activeWords
    status
    players
    winners
    winnerCount
  chat/messages
```

Đổi namespace là thay đổi có chủ đích để tránh nội dung HCM202 hoặc môn trước đó xuất hiện trong VNR202. Không tự ghi đè `gameState` và `chat` cũ. Những tab chạy bản cũ sẽ ở phòng cũ; tất cả thành viên lớp cần mở cùng bản VNR202.

Không có thao tác deploy rules, xóa dữ liệu hoặc ghi dữ liệu Firebase trực tiếp trong quá trình cập nhật mã. Việc khởi tạo chỉ xảy ra khi trọng tài đăng nhập ứng dụng đã cập nhật.

## 5. Nội dung và nguồn

`src/data/sources.js` chứa các liên kết đã tra cứu: Cổng thông tin Quốc hội, Bảo tàng Lịch sử quốc gia, di tích Dinh Độc Lập, Tư liệu Văn kiện Đảng, Cổng thông tin Chính phủ, Bộ Công Thương, Bộ Công an, Cổng thông tin Quảng Ninh và UBND xã Ba Chúc.

Đây là ngân hàng biên soạn để nhóm rà soát, không tự nhận đã được giảng viên kiểm duyệt. Chưa nhận được giáo trình/slide Chủ đề 5 của lớp nên chưa thể đối chiếu số trang, thuật ngữ riêng hoặc mức độ kiến thức mà giảng viên yêu cầu. Trước nghiệm thu nội dung, cần duyệt từng ID câu hỏi, tính đúng của đáp án và mức độ phù hợp với học phần.

Ảnh:

| File | Tác giả | Giấy phép / trang gốc |
| --- | --- | --- |
| `public/history/palace.jpg` | Clay Gilliland | [CC BY-SA 2.0 / Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Independence_Palace_or_Reunification_Palace_(12110613104).jpg) |
| `public/history/ba-dinh.jpg` | joxeankoret | [CC BY-SA 2.0 / Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Ba_Dinh_Hall_1462359227_71b04ee08a.jpg) |
| `public/history/ba-chuc.jpg` | Bùi Thụy Đào Nguyên | [CC BY-SA 4.0 / Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Nhà_mồ_Ba_Chúc.jpg) |

Các file tải về là bản ảnh do Wikimedia cung cấp, không chỉnh sửa nội dung; UI dùng object-fit cắt khung hiển thị. Pò Hèn dùng khung chữ thông tin có chủ đích, không dùng ảnh một di tích khác để minh họa sai.

## 6. Ma trận nghiệm thu và phần còn thiếu

| Yêu cầu | Trạng thái / giới hạn |
| --- | --- |
| Nhận diện VNR202 trên các màn hình hoạt động | Đã cập nhật |
| Trang chủ, khám phá, Quiz, Bingo | Đã có |
| Địa điểm có nguồn và phân biệt trạng thái tham quan | Đã có |
| Thay đủ sáu địa điểm và đủ ảnh đại diện | Chưa đủ: bốn địa điểm, ba ảnh; cần thêm hai địa điểm và ảnh Pò Hèn đủ quyền sử dụng |
| Tour 3D thực sự | Chưa có nguồn xác minh; không gắn nhãn 3D |
| Quiz 30–40 câu và sáu chủ đề | Đã có 36 câu; cần nhóm/giảng viên duyệt |
| Lượt 10–15 câu | Có; lọc một chủ đề chỉ có sáu câu, UI thông báo rõ trước chơi |
| Practice và Challenge | Đã có |
| Xem đáp án/lời giải/nguồn/chơi lại | Đã có |
| Giữ Bingo và chat realtime | Giữ mã cơ chế; chưa chạy nghiệm thu nhiều người với Firebase thật |
| Mobile | Đã xem bố cục 390px, kiểm tra không tràn ngang trang chủ/kết quả; cần thêm ma trận thiết bị thật |
| Live Classroom Quiz, leaderboard Quiz, xuất kết quả | Không thuộc MVP, chưa triển khai |
| Đổi tên miền Vercel | Chưa thực hiện; cần thao tác trong tài khoản Vercel của nhóm và kiểm tra tên còn trống |
| Phân quyền trọng tài | Thiết kế cũ chưa an toàn: PIN client và rules công khai; cần Auth + role rules cho bản dùng công khai |

## 7. Kiểm tra

- `npm test`: bốn nhóm test cho cấu trúc ngân hàng, lọc/chọn câu không lặp, chấm điểm A/index 0 và câu bỏ trống, kho Bingo đủ 25 từ khác nhau.
- `npm run lint`: không lỗi/cảnh báo sau cập nhật.
- `npm run build`: build production thành công.
- Browser: hoàn thành một lượt Practice 10 câu; xác nhận khóa đáp án và hiện giải thích; kiểm tra điểm, kết quả và lọc câu sai.
- Browser: hoàn thành một lượt Challenge 10 câu; kiểm tra đồng hồ và không xuất hiện đáp án giữa lượt; lời giải xuất hiện ở kết quả.
- Chưa chờ hết toàn bộ deadline trong bài kiểm tra trình duyệt; chưa kiểm tra tab ngủ/resume thực tế.
- Không thực hiện bài kiểm tra ghi dữ liệu trên Firebase thật; cần nhóm tổ chức một lượt có trọng tài, ít nhất hai người chơi và màn `/live` trước buổi học.

## 8. Cách duyệt bản cập nhật

Chạy `npm ci`, `npm run dev` và mở URL Vite in ra. Xem lần lượt `/`, `/explore`, `/quiz`, `/bingo`, `/admin`, `/live`. Sau khi nhóm duyệt nội dung và nghiệm thu Bingo, build `dist/` và triển khai bằng project Vercel hiện có. Không cần đổi database hoặc frontend framework để hoàn thành MVP.
