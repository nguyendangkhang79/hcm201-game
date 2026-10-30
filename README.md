# Dấu ấn lịch sử Đảng · VNR202

Ứng dụng React + Vite chuyển từ chủ đề cũ sang Lịch sử Đảng Cộng sản Việt Nam, trọng tâm Chủ đề 5 (1975–1986). Giữ kiến trúc React Router và chức năng Bingo qua Firebase.

## Chạy tại máy

```sh
npm ci
npm run dev
npm test
npm run lint
npm run build
```

Vite in địa chỉ xem trước trong terminal. Build nằm ở `dist/`. Giữ file `vercel.json` để truy cập trực tiếp các route của SPA.

## Các trang

| Route | Chức năng |
| --- | --- |
| `/` | Giới thiệu, timeline, địa điểm, lối vào Quiz/Bingo |
| `/explore` | Lọc giai đoạn, xem sự kiện và nguồn |
| `/explore?site=ba-dinh` | Chi tiết một địa điểm |
| `/quiz` | Tự luyện và thử thách, chấm điểm, xem lời giải |
| `/bingo` | Nhập tên và hướng dẫn Bingo |
| `/play` | Xếp bảng và tham gia Bingo cùng lớp |
| `/admin` | Điều khiển Bingo theo cơ chế PIN cũ |
| `/live` | Người tham gia và kết quả trực tiếp |

## Dữ liệu cần biên tập

- `src/data/quiz.js`: 36 câu hỏi, sáu nhóm; chỉ số đáp án đúng từ 0 đến 3.
- `src/data/history.js`: địa điểm, sự kiện, timeline, trạng thái tham quan và bản quyền ảnh.
- `src/data/sources.js`: nguồn tham khảo chính thống dùng chung.
- `src/data/bingo.js`: 36 từ khóa VNR202.

Mỗi lượt Quiz chọn ngẫu nhiên 10 hoặc 15 câu, không lặp. Nếu bộ lọc chỉ còn sáu câu thì dùng sáu câu và thông báo trước khi chơi. Thử thách có tổng thời gian bằng số câu × 45 giây; 100 điểm/câu đúng, không thưởng tốc độ. Kết quả ở bộ nhớ trình duyệt; tải lại trang sẽ bắt đầu lại.

Bingo chuyển sang `courses/vnr202/gameState` và `courses/vnr202/chat/messages`. Lần đăng nhập trọng tài đầu tiên khởi tạo kho từ khóa bằng transaction nếu chưa có dữ liệu. Không ghi đè kho đã tồn tại và không di chuyển/xóa phòng cũ.

Xóa kho lưu `wordList: false` để phân biệt kho đã được xóa với kho chưa khởi tạo (`null`); không tự nạp lại từ mặc định sau khi xóa. Thao tác này đưa ván về trạng thái chuẩn bị và xóa kết quả. Trạng thái mở khóa trọng tài được giữ bằng `sessionStorage` trong tab hiện tại; đây chỉ là duy trì giao diện của cơ chế PIN cũ, không thay thế Firebase Authentication.

## Giới hạn bàn giao

Đây là bản triển khai cục bộ, chưa đổi tên miền hoặc triển khai Vercel. Dữ liệu lịch sử đã kèm nguồn đối chiếu nhưng nhóm/giảng viên cần duyệt theo đúng giáo trình đang học. Có bốn địa điểm, chưa đủ sáu; Pò Hèn chưa có ảnh được cấp phép hoặc tour số. Không địa điểm nào được quảng cáo là tour 3D khi chưa xác minh.

Cơ chế PIN phía client và Firebase rules đọc/ghi công khai là thiết kế có sẵn, chưa phải phân quyền an toàn. Cần Firebase Authentication và rules kiểm tra vai trò trước khi sử dụng công khai có yêu cầu chống can thiệp kết quả.

Xem phân tích, quyết định và ma trận nghiệm thu tại [docs/VNR202_REVAMP.md](docs/VNR202_REVAMP.md).
