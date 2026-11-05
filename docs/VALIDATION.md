# Kiểm tra bản MVP

Các bước đã chạy trong cloud environment:

- `npm ci`: cài lại thành công từ package-lock.json.
- `npm run build`: TypeScript + Vite build thành công. Scene 3D được tách thành chunk tải riêng.
- `npm test`: 14/14 kiểm thử backend đạt (luồng demo, chuyển ngữ cảnh, lỗi provider, SQLite/restart, HTTP/SSE; thêm hợp đồng tiến trình Codex, stdin, timeout, login và ba lượt agent qua CLI giả lập).
- `npm run test:e2e`: 5/5 kiểm thử Chromium đạt (desktop chọn agent/reset camera/giao việc/xuất file/reload, mobile, dự phòng thiếu WebGL và hiển thị/làm mới trạng thái đăng nhập Codex).
- `npm run dev`: khởi động API và Vite; `/api/health` qua proxy frontend trả `ok: true`, `mode: live`, `provider: codex`.

Kiểm thử browser dùng Chromium có sẵn tại `/usr/bin/chromium`. Mạng môi trường chặn `cdn.playwright.dev`, nên không dựa vào tải browser từ đó.

Không có `AI_API_KEY` trong máy lúc kiểm tra: chưa gọi provider thật, chưa xác nhận quyền truy cập model hoặc phí API. Test adapter không thay cho kiểm thử này. Các kết quả demo đều có nhãn mô phỏng.

Chưa triển khai lên Internet hoặc push GitHub. Repo ban đầu chưa có commit/branch main trên remote. Code hiện nằm trong checkout để xem xét và commit sau.

## Codex CLI

CLI sẵn có: codex-cli 0.166.0-alpha.1. `codex login status` trả đăng nhập ChatGPT; chưa xác định hạng Plus hoặc quota của phiên. Lần gọi thực tế qua adapter timeout sau 45 giây; chẩn đoán lời gọi có phản hồi 403 và đích chatgpt.com. Không có kết quả model để xác nhận thành công. Runtime allowlist hiện chưa có chatgpt.com.

Đã lưu vào draft quyền mạng chatgpt.com (suy luận), auth.openai.com (đăng nhập), AI_PROVIDER=codex và hướng dẫn startup mới. Quyền api.openai.com cũ được giữ cho provider OpenAI tùy chọn. Draft chưa áp dụng/publish; sau khi người dùng lưu cài đặt, cần kiểm thử lại suy luận thật. Không chép hoặc đọc nội dung file xác thực.

## Bản 0.2 — quản lý công việc

Đã kiểm tra hàng đợi FIFO và không gọi provider đồng thời, hủy chặn kết quả trả muộn, bỏ qua việc chờ đã hủy, thử lại tạo ID mới, tiếp tục sau khi một việc lỗi, queue đầy trả 429 và phục hồi sau restart không tự thực thi lại. Test Codex xác nhận hủy sẽ kết thúc tiến trình con và dọn thư mục tạm.

Chromium xác nhận chuyển 2D/3D, nhớ chế độ sau reload, giao hai việc liên tiếp, hủy việc chờ, thử lại, hoàn thành ba bước, tìm kiếm và lọc trạng thái. Chromium đã kiểm tra desktop/mobile; ảnh mobile được kiểm tra trực quan. Lỗi mất nội dung vừa gõ khi phản hồi gửi việc trước về đã được sửa.

Kiểm thử suy luận thật qua Codex vẫn chưa được xác nhận; các kiểm thử UI dùng demo và kiểm thử CLI dùng tiến trình giả lập. Chưa có thay đổi runtime mạng được xác nhận trong lượt này.
