# Quiz VNR202: hoàn thiện chức năng và bảo vệ kết quả

## Chức năng hiện tại

- 60 câu, sáu chủ đề, 10 câu/chủ đề. Lượt 10 câu có thể chọn một chủ đề; lượt 15 câu cần chọn thêm chủ đề. Không nhân bản câu để đủ số lượng.
- Tự luyện: không giới hạn thời gian; lời giải chỉ xuất hiện sau khi máy chủ ghi nhận và khóa đáp án.
- Thử thách: 45 giây/câu tính chung toàn bài; máy chủ chỉ gửi câu hiện tại và các phương án đã đảo. Đáp án/lời giải chỉ trả sau khi kết thúc.
- Lưu tiến độ và kết quả trên máy chủ tối đa 48 giờ. Tải lại không tạo bài mới hay kéo dài deadline. Cần giữ cookie và dùng cùng trình duyệt để khôi phục.
- Lưu lựa chọn chưa xác nhận trong tab để khôi phục bản nháp. Chỉ đáp án đã được API xác nhận mới được tính điểm.
- Kết quả có điểm, thời gian, câu chưa làm, bộ lọc câu sai, lời giải, nguồn và tải CSV.
- Mỗi cookie người chơi có một bài đang làm. Tab tải/mở lại tiếp quản quyền gửi đáp án; tab cũ nhận `SESSION_MOVED` và phải chủ động tiếp quản để dùng tiếp.
- Ghi nhận sự kiện rời tab trong Challenge; không trừ điểm, không tự kết luận gian lận.

Ngân hàng đã được biên soạn kèm nguồn. Chưa có giáo trình/slide của lớp nên **chưa thể xác nhận đã được giảng viên duyệt hoặc khớp toàn bộ chuẩn đầu ra của lớp**. Nhóm cần rà soát câu hỏi trong `server/questionBank.js` trước khi dùng làm bài đánh giá chính thức.

## Kiến trúc

```text
React /quiz
   -> same-origin /api/quiz
      -> server/quizService.js: phát câu, khóa đáp án, deadline, điểm
      -> private Upstash Redis: snapshot đề, đáp án đã chọn, thời gian, phiên
```

`server/questionBank.js` không được import vào mã frontend. `src/data/quiz.js` chỉ chứa chủ đề. Bài làm lưu snapshot đề/phương án để thay nội dung hoặc deploy phiên bản mới không làm đổi đáp án của bài đang diễn ra.

API sử dụng cookie HttpOnly được ký HMAC; production thêm Secure và SameSite=Strict. Cookie gắn người chơi ẩn danh với bài làm, không chứa đáp án. Origin và kiểu nội dung được kiểm tra trước các POST. Có giới hạn kích thước body, số lượt tạo và tần suất yêu cầu; IP chỉ dùng làm bucket HMAC giới hạn tần suất, không lưu nguyên IP trong bài làm.

Các thao tác lưu đáp án dùng so sánh revision và cập nhật nguyên tử qua Redis Lua. Hai yêu cầu xung đột không thể cùng sửa một câu. Retry cùng đáp án trả lại trạng thái đã lưu; retry chuyển câu không bỏ qua câu tiếp theo. Điểm, deadline, thời điểm nhận và đáp án đúng không lấy từ body của client.

API kiểm tra deadline ở mọi lần nhận thao tác. Nếu trình duyệt ngủ hoặc bị đóng, bài được kết thúc tại thời hạn gốc trong lần đồng bộ kế tiếp. Máy chủ không cần đợi đồng hồ client chạy về 0 và không chấp nhận đáp án đến sau hạn. Thời điểm kết thúc được giữ tại deadline, không phải thời điểm người dùng quay lại.

## Thiết lập Vercel

1. Tạo một database Upstash Redis riêng hoặc kết nối qua Vercel Marketplace. Giữ REST token chỉ ở máy chủ, không công khai quyền đọc/ghi.
2. Trong Environment Variables của project Vercel, thêm:

   | Biến | Giá trị |
   | --- | --- |
   | `UPSTASH_REDIS_REST_URL` | HTTPS REST endpoint của database |
   | `UPSTASH_REDIS_REST_TOKEN` | REST token có quyền đọc/ghi |
   | `QUIZ_SESSION_SECRET` | Chuỗi ngẫu nhiên ít nhất 32 ký tự |

3. Tạo khóa bằng `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` và lưu vào cấu hình Vercel. Không gửi khóa lên chat/Git, không thêm tiền tố `VITE_`. Đổi khóa sẽ làm cookie phiên cũ mất hiệu lực.
4. Build command: `npm run build`; output static: `dist`; giữ thư mục `api/` ở root project để Vercel đóng gói Node function. Dùng Node 22 hoặc mới hơn.
5. Redeploy sau khi thêm các biến. Thiết lập đúng biến cho cả Production/Preview mà nhóm muốn dùng. Có thể dùng database riêng cho Preview để tránh trộn dữ liệu thử.
6. Mở `/api/quiz`: phải trả JSON catalog, `total: 60`, `development: false`. Mở `/quiz` để chạy bài kiểm tra thực tế; reload giữa bài phải giữ tiến độ/giờ.

Nếu chưa có kho dữ liệu/khóa hoặc kho dữ liệu lỗi, API trả 503. Không có đường lui tự chấm điểm ở browser. File `.env.example` chỉ là tên biến, chưa có thông tin tài khoản thật. Không triển khai hay cấu hình tài khoản bên ngoài trong đợt sửa mã này.

Vercel ưu tiên filesystem/function trước SPA rewrites; `/api/quiz` là function, các route UI dùng `/index.html`. Tham khảo [Vite Functions](https://vercel.com/docs/frameworks/frontend/vite) và [Vercel rewrites](https://vercel.com/docs/project-configuration/vercel-json). Redis dùng [REST API và EVAL](https://upstash.com/docs/redis/features/restapi), không dùng pipeline không nguyên tử để ghi đáp án.

## Chạy local

`npm run dev` chạy Vite và API cùng origin. Mặc định dùng store trong bộ nhớ chỉ để kiểm thử; không dùng cho chấm điểm thật, khởi động lại sẽ mất dữ liệu. Trên local, `development: true` và màn hình hiển thị thông báo này.

Để thử với Redis thật, tạo `.env.local` từ `.env.example`, điền các biến rồi khởi động lại dev server. Không thay đổi hoặc tận dụng Firebase rules công khai để lưu Quiz. `npm run preview` chỉ phục vụ static nên không dùng để kiểm thử API; có thể dùng `vercel dev` với cấu hình phù hợp nếu cần mô phỏng hosting.

## Phạm vi chống gian lận

Đã xử lý: xem đáp án trong bundle client trước bài; tự gửi điểm/thời hạn; sửa câu đã chấm; gửi câu sai thứ tự; dùng phương án từ bài khác; giả cookie; truy cập bài của cookie khác; gửi đồng thời; tạo lại bài bằng reload; câu trả lời muộn do đổi giờ, ngủ máy hoặc mất mạng.

Không tuyên bố chống gian lận tuyệt đối. Người học vẫn có thể biết câu trả lời từ lần luyện trước, dùng AI/điện thoại/người hỗ trợ, tự đổi nội dung hiển thị trong DevTools, hoặc tạo danh tính ẩn danh mới bằng cách xóa cookie/đổi trình duyệt. Snapshot/CSV ở phía người dùng không phải chứng chỉ không thể giả mạo. Khi cần đánh giá chính thức, cần bổ sung danh tính thật, danh sách lớp và giới hạn lượt do giảng viên quản lý.

Theo dõi rời tab là tín hiệu phía client, có thể bị tắt hoặc báo thiếu; không dùng riêng nó để xác định gian lận. Không chặn phím tắt/copy, không bật camera, không thu hình hay ghi màn hình. Request retry/lỗi mạng không tự trừ điểm. Khi không liên lạc được máy chủ, UI giữ lựa chọn và yêu cầu đồng bộ; câu chưa đến máy chủ trước deadline không được tính.

Phân quyền trọng tài/Firebase của **Bingo** chưa thay đổi trong đợt này. Chế độ live classroom, bảng xếp hạng nhiều người và hệ thống giám thị không thuộc phần Quiz cá nhân vừa hoàn thiện.

## Kiểm chứng

- `npm test`: kiểm tra schema 60 câu; chọn câu; giới hạn server; khóa đáp án; dữ liệu bị sửa; hết giờ tại ranh giới; ngủ/reload; nhiều tab; các yêu cầu xung đột; retry; cookie; Origin; rate limit; lỗi kho dữ liệu.
- `npm run lint`, `npm run build`.
- `node tests/checkQuizBundle.mjs`: kiểm tra không có văn bản ngân hàng câu hỏi trong các bundle JavaScript/sourcemap công khai.
- Browser local: đi hết Practice 10 câu và Challenge 15 câu; reload giữa bài giữ đáp án/tiến độ; mở tab thứ hai chặn tab cũ; lời giải thử thách chỉ xuất hiện cuối lượt.
- Deadline được thử tự động bằng clock điều khiển của server, bao gồm ranh giới trước/đúng/sau hạn và trở lại sau thời gian ngủ. Không thay thời lượng production để test và chưa thực hiện ngủ máy vật lý trong trình duyệt.
- Chưa nghiệm thu Redis/Vercel thật vì chưa có cấu hình tài khoản. Khi deploy cần chạy lại bài nhiều tab, hết giờ và mất kết nối trên môi trường đó.
