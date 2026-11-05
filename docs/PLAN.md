# Kế hoạch Văn Phòng AI

## Giai đoạn 1 — MVP trong repo này

Mục tiêu: mở văn phòng 3D, chọn đồng đội, giao mục tiêu và theo dõi ba bước xử lý có kết quả lưu lại.

- [x] React + TypeScript + Vite; backend Node.js 24 + Express.
- [x] Phòng 3D dựng bằng geometry, ba nhân vật, cây xanh, bàn làm việc, góc nhìn xoay/zoom/reset.
- [x] Giao diện tiếng Việt, roster có thể dùng bàn phím, bố cục mobile và dự phòng thiếu WebGL.
- [x] Điều phối → phân tích → sáng tạo; cập nhật SSE, lịch sử SQLite, xuất TXT/sao chép.
- [x] Chế độ mô phỏng rõ ràng và adapter OpenAI Responses API phía server.
- [x] Skill dự án dựa trên tài liệu chính thức của pmndrs/react-three-fiber, pmndrs/drei và openai/openai-node.
- [x] Build TypeScript/Vite, 5 kiểm thử backend và 3 kiểm thử trình duyệt (desktop, mobile, thiếu WebGL).
- [x] Provider Codex CLI: gọi tiến trình bằng stdin, phiên ChatGPT phía server, kiểm tra đăng nhập, timeout và thông báo lỗi an toàn.
- [ ] Xác nhận suy luận Codex thật: lần thử trong cloud đã timeout kèm phản hồi 403 cho chatgpt.com; cần cập nhật quyền mạng rồi kiểm tra lại.
- [ ] Kiểm thử OpenAI API với key/model của chủ dự án nếu chọn provider này.

Tiêu chí nghiệm thu: build thành công, test backend qua, giao việc trên trình duyệt đi đủ 3 bước, reload còn kết quả, không đưa key vào frontend.

## Giai đoạn 2 — Agent làm việc thực tế

Đã hoàn thành bản 0.2:

- [x] Hàng đợi FIFO, tối đa 20 việc chạy/chờ, một lượt provider mỗi lần.
- [x] Hủy công việc chờ/đang chạy với AbortSignal tới Codex và OpenAI, giữ kết quả từng bước.
- [x] Thử lại tạo lượt mới; không tự chạy lại việc sau restart.
- [x] Tổng quan trạng thái, tìm kiếm và lọc lịch sử, tiến độ ba agent.
- [x] Chế độ sơ đồ 2D có nhớ lựa chọn, không cần WebGL.

Tiếp theo: streaming token, giới hạn ngân sách và công cụ tìm kiếm có trích nguồn. Chọn use case đầu tiên: nội dung/marketing hoặc lập trình. Công cụ có tác động bên ngoài cần quyền truy cập được giới hạn và xác nhận trước thao tác quan trọng.

## Giai đoạn 3 — Trải nghiệm 3D

Model GLB có giấy phép rõ ràng; animation đi lại và ngồi; vùng họp; hoạt động tương ứng với trạng thái backend. Giữ chế độ 2D cho thiết bị yếu. Không để logic 3D quyết định trạng thái thực thi.

## Giai đoạn 4 — Triển khai nhiều người dùng

Đăng nhập, phân quyền từng workspace, CSRF khi dùng cookie, rate limit, queue bền vững, cơ sở dữ liệu phù hợp nhiều tiến trình, quản lý key/chi phí và retention. Kiểm thử tải, bảo mật và quy trình phục hồi trước khi công khai.

## Quyết định kỹ thuật

Dùng hình khối tự dựng thay vì tải asset để khởi động nhanh, không có phụ thuộc asset ngoài. Vite phù hợp dashboard SPA; backend độc lập giữ key trên server. SQLite phù hợp một tiến trình MVP. Ba agent hiện là ba lượt gọi model với vai trò khác nhau, chưa phải hệ agent tự chủ có tool.
