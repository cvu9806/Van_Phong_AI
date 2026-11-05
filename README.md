# Văn Phòng AI

Văn phòng 3D tương tác với ba đồng đội: **Minh** điều phối, **Linh** phân tích, **An** hoàn thiện nội dung. Giao diện tiếng Việt; React Three Fiber + Node.js + SQLite.

## Chạy trên máy phát triển

Yêu cầu **Node.js 24 trở lên** và npm. Dùng checkout hiện tại.

```sh
npm ci
npm run dev
```

Frontend ở cổng 5173; Vite chuyển `/api` đến backend cổng 3001. Mở frontend bằng trình duyệt hỗ trợ WebGL. Nếu máy không có WebGL, danh sách agent và giao việc vẫn dùng được.

## Dùng ba agent qua Codex CLI / ChatGPT

Trên **máy chạy backend**, cài CLI chính thức rồi đăng nhập:

```sh
npm install -g @openai/codex
codex login
codex login status
```

Chọn đăng nhập bằng ChatGPT để dùng hạn mức Codex của tài khoản có quyền truy cập (ví dụ Plus). Trên máy không mở được browser, dùng `codex login --device-auth` theo hướng dẫn CLI. Đăng nhập ở laptop không tự đăng nhập cho cloud server. Không gửi token, file auth hoặc mật khẩu vào chat/Git.

Sao chép `.env.example` thành `.env` **nếu chưa có**, giữ `AI_PROVIDER=codex`, rồi chạy `npm run dev`. Mặc định khi chưa đặt AI_PROVIDER cũng là `codex`. Không cần `AI_API_KEY`. UI hiển thị Codex CLI và tình trạng đăng nhập; nút **Kiểm tra lại kết nối** cập nhật trạng thái sau khi bạn login. Đây là kiểm tra xác thực, chưa chứng minh còn hạn mức hoặc gọi model thành công.

Nếu CLI không ở PATH, đặt `CODEX_BIN` thành đường dẫn executable. Backend gọi `codex exec` cho từng vai trò; chuyển kết quả bước trước sang bước tiếp theo; nhận câu trả lời cuối và lưu SQLite. Mỗi công việc chạy ba lượt, dùng hạn mức/phương thức xác thực của CLI đang đăng nhập. Nếu CLI đăng nhập bằng API key, phí có thể thuộc API, không phải Plus.

CLI phải hỗ trợ `exec --ephemeral --ignore-user-config`, `--sandbox read-only`, `--output-last-message` và các feature flags dùng trong `server/codex.mjs`; cập nhật CLI nếu báo không hỗ trợ. Agent chạy trong thư mục tạm, truyền yêu cầu bằng stdin, không dùng shell để ghép lệnh, không cấp quyền sửa repo. Luồng này phục vụ lập kế hoạch/phân tích/nội dung; chưa cho agent sửa code hay thao tác dịch vụ ngoài. Không dùng cờ bỏ qua sandbox/approval. Lượt chạy không nạp user config/MCP/app; dùng model mặc định của CLI, không dùng `AI_MODEL`. Đăng nhập vẫn lấy từ kho auth hiện có của CLI.

Mạng cloud cần cho phép các đích Codex và đăng nhập ChatGPT theo cấu hình runtime; trạng thái login thành công không chứng minh kết nối suy luận hoạt động. Lỗi mạng, timeout và hết hạn mức được báo lỗi, không tự chuyển sang kết quả giả.

## Các chế độ khác

- `AI_PROVIDER=demo`: mô phỏng theo kịch bản, không gọi AI, không cần CLI/key.
- `AI_PROVIDER=openai`: dùng Responses API; cần `AI_API_KEY`, tùy chọn `AI_MODEL` (mặc định `gpt-4.1-mini`). Thanh toán API riêng, không dùng hạn mức ChatGPT Plus.

Giữ key ở server, không dùng tiền tố `VITE_`. Trong cloud có mạng hạn chế, chế độ OpenAI API cần `api.openai.com`.

## Build và kiểm tra

```sh
npm test
npm run build
npm start
```

Kiểm thử giao diện: `npm run build && npm run test:e2e`. Cấu hình tự dùng `/usr/bin/chromium` nếu có, hoặc `CHROMIUM_PATH` do bạn chỉ định; nếu chưa có browser, dùng `npx playwright install chromium` khi mạng cho phép.

`npm start` phục vụ bản build và API trên cổng 3001, mặc định chỉ lắng nghe loopback 127.0.0.1. `GET /api/health` kiểm tra chế độ; `GET /api/provider` kiểm tra tình trạng đăng nhập/cấu hình an toàn; `GET /api/office` đọc trạng thái; `GET /api/events` phát SSE; `POST /api/jobs` nhận `{ "prompt": "..." }` từ 10–4.000 ký tự. Mỗi lần chạy một công việc; tối đa 20 công việc đang chạy/chờ trong hàng đợi FIFO.

Lịch sử lưu ở `.data/office.sqlite`, hoặc đường dẫn `OFFICE_DB_PATH`. Không xóa database nếu muốn giữ lịch sử. Công việc đang chạy hoặc đang chờ khi server restart được đánh dấu lỗi để tránh tự chạy lại các lượt có thể tính hạn mức. Chọn Thử lại để tạo một lượt mới. Giao diện hiển thị 50 công việc gần nhất; bản MVP chưa có xóa/lọc lịch sử hoặc chính sách retention.

Đây là prototype cho môi trường phát triển tin cậy, **chưa có đăng nhập hoặc phân quyền**. Không công khai server trước khi hoàn thành giai đoạn bảo mật trong [kế hoạch](docs/PLAN.md). Nếu muốn dùng bên ngoài localhost, cần thiết lập truy cập riêng có kiểm soát.

## Skill dự án

- [.agents/skills/office-3d/SKILL.md](.agents/skills/office-3d/SKILL.md): scene, nhân vật, camera và kiểm tra WebGL.
- [.agents/skills/agent-orchestration/SKILL.md](.agents/skills/agent-orchestration/SKILL.md): điều phối, API, persistence và kiểm thử.

Các skill được viết cho dự án sau khi tham khảo README chính thức của [React Three Fiber](https://github.com/pmndrs/react-three-fiber), [Drei](https://github.com/pmndrs/drei) và [OpenAI Node](https://github.com/openai/openai-node). Không cài script/skill không rõ nguồn gốc từ GitHub.

## Quản lý văn phòng (0.2)

- Chuyển **Không gian 3D / Sơ đồ 2D**; lựa chọn được nhớ trên trình duyệt. 2D không tải canvas WebGL.
- Giao thêm việc khi đội ngũ đang bận: yêu cầu mới vào hàng đợi theo thứ tự. Bảng tổng quan đếm trạng thái toàn bộ lịch sử; danh sách hiển thị 50 công việc mới nhất.
- Mở một công việc để xem tiến độ từng agent, hủy việc đang chạy/chờ hoặc thử lại việc lỗi/đã hủy. Hủy giữ kết quả từng bước đã hoàn thành và không bảo đảm hoàn lại hạn mức đã sử dụng.
- Thử lại tạo ID mới, giữ lịch sử cũ và chạy đủ ba bước với provider đang cấu hình.
- Tìm theo nội dung hoặc lọc theo trạng thái; **Dùng lại yêu cầu** điền nội dung vào form để bạn sửa trước khi gửi.

API thêm: `POST /api/jobs/:id/cancel`, `POST /api/jobs/:id/retry`. Hàng đợi đầy trả 429; trạng thái không cho phép trả 409; ID không tồn tại trả 404. SQLite giữ hàng đợi nhưng không tự chạy tiếp sau restart.
