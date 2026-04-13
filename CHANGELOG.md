# NHẬT KÝ PHÁT TRIỂN HỆ THỐNG ACE HRM (Báo tăng & Quản lý hợp đồng)

Dưới đây là nhật ký tổng hợp toàn bộ các thay đổi, sửa lỗi và nâng cấp kiến trúc của hệ thống tính đến thời điểm hiện tại. Tài liệu này đóng vai trò quan trọng khi bàn giao hoặc đưa dự án lên kiểm thử (UAT) / triển khai chính thức (Production).

## 🚀 1. Tự động hóa Google Drive & Google Sheet (Back-end Proxy)
- **Tạo cấu trúc tự động:** Kịch bản Google Apps Script nay đã có khả năng nhận file Base64 từ bộ đệm Web phân giải. Tự động sinh ra cấu trúc thư mục dạng Cây: `[Root] -> [Tên Chi Nhánh] -> [Tháng hiện tại] -> [File Scan PDF]`.
- **Chuẩn hóa quy ước đặt tên file:** Tên file tải lên được hệ thống tự động đổi thành: `[Mã_NV]_[Họ_Tên]_[Loại_Hồ_Sơ]_[Giờ_Ngày].pdf` bảo đảm không bao giờ trùng lặp và cực kỳ an toàn.
- **Biên dịch MimeType:** Khắc phục triệt để lỗi "parent.mimeType" trên DriveApp bằng cách giải mã luồng Base64 trực tiếp vào lớp `Utilities.newBlob()`, đáp ứng bảo mật tuyệt đối cho file `.pdf`.
- **Đồng bộ hóa 9 Trường Dữ Liệu:** Đẩy thông tin đồng bộ về Google Sheet (`Log_Upload`) bao gồm 9 cột: Thời Gian, Chi Nhánh, Mã NV, Vị Trí, Họ Tên, Loại Hồ Sơ, Tên File, Link Drive, và Trạng Thái Thông Báo.

## 📧 2. Hệ thống Gửi Email Thông Báo Thông Minh
- **Nút Menu Chuyên Dụng:** Tích hợp nút `🚀 ACE HRM -> Gửi thông báo ĐÃ NHẬN hồ sơ` ngay trên giao diện của Google Sheet giúp ban quản trị phê duyệt một chạm.
- **Gom Nhóm Hồ Sơ (Batching):** Khi admin phê duyệt, hệ thống sẽ thực hiện quét và **gộp tất cả các hồ sơ của cùng một chi nhánh vào DUY NHẤT một email**.
- **Giao diện HTML chuyên nghiệp:** Email sử dụng thiết kế Dark-blue Slab tĩnh siêu nhẹ, hiển thị dữ liệu dạng bảng cực mịn, phân nhóm chi tiết theo từng loại (Báo tăng nhân sự, Quy trình Hợp đồng, ...).
- **Tự động gắn Flag:** Đánh dấu mốc thời gian "✅ Gửi 23:xx" trở ngược lại Sheet để loại bỏ hoàn toàn hiện tượng spam trùng lặp cho chi nhánh.

## 💻 3. Đồng bộ Khối Giao diện Web (Front-end - React / Vite)
- **Thiết kế tập trung Dữ Liệu (UI/UX):** Ở tính năng `PersonnelMovementView.jsx` (Báo tăng).
  - Tự động điền cố định tên Chi Nhánh thuộc phiên đăng nhập của người dùng vào ô *Phòng ban/Chi nhánh* ở trạng thái chỉ đọc (Read Only).
  - Loại bỏ hoàn toàn ô thu thập "Mức Lương" ra khỏi giao diện để tuân thủ quyền riêng tư thông tin nhân sự.
- **Truyền dẫn Payload mới:** Bổ sung trường `vi_tri`, định dạng dấu Tiếng Việt chuẩn hóa (`Báo tăng nhân sự`, `Quy trình Hợp đồng`) thông qua Base64 Payload để Apps Script nhận diện mặt chữ hiển thị lên Email.
- **Khắc phục nghẽn Cổ chai Proxy:** Đã sửa lỗi nghiêm trọng ở Cổng Gateway phụ (`api/[...path].js`). Proxy này trước đó đã tước bỏ payload hình ảnh Base64. Nó đã được viết lại để Forwarding toàn bộ gói tin gửi từ Browser thẳng đến nền tảng Apps Script.
- **Cơ chế Fallback thông minh (Super Mock Mode):** Đã nhúng hệ thống ngắt mạch và lưu tạm vào RAM/LocalStorage. Vì vậy ngay cả khi không có mạng lưới Supabase kết nối, người dùng vẫn có thể "gửi phê duyệt", "Duyệt đơn", "Từ chối" hoạt động hoàn toàn trơn tru y như hệ thống Live.

## 🔧 4. Chỉ dẫn cấu hình Production (Dành cho việc Đẩy lên GitHub)
Trước khi push hệ thống này lên môi trường Vercel hoặc Netlify, nhà phát triển cần chuẩn bị toàn diện các biến môi trường sau ở File `.env` Server:

```env
# 1. Supabase Client Endpoints
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...

# 2. Supabase Server Endpoints (Node.js/Next/Express Gateway)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# 3. Microservice Endpoints (Google Apps Script)
VITE_SCRIPT_URL=https://script.google.com/macros/s/.../exec
VITE_SYNC_SECRET=moon_map_2026
```

> **Ghi chú riêng:** File `.env` bắt buộc phải có mặt trong `.gitignore` để tránh rủi ro bảo mật lộ Service Role Key toàn quyền của Supabase.
