# ACE Task Manager - HR Management System

Hệ thống quản lý nhân sự và hợp đồng chuyên nghiệp cho ACE.

## File Structure
- `/src`: Mã nguồn ứng dụng (React + Tailwind)
- `/MD`: Tài liệu hệ thống và nhật ký phát triển (.md files)
- `/REF`: Các file tham khảo, mockup và dữ liệu mẫu
- `/functions`: Firebase Cloud Functions
- `/supabase`: Cấu hình và Migration database

## Các Tiêu Chuẩn Demo
1. **Mã Số Nhân Viên**: Định dạng 4 chữ số cố định (`0xxx`).
2. **Số Hợp Đồng**: Tự động sinh theo định dạng `HĐLD-{Mã NV}`.
3. **Xem Trước Hợp Đồng**:
   - Chế độ "Word Review" (docx-preview) chuẩn A4.
   - Tự động co giãn (Auto-scaling) cho Tablet 10" và Laptop nhỏ.
   - Nút **TẢI HĐLĐ** nổi bật để xuất file .docx.
4. **Tính Responsive**:
   - Sidebar linh hoạt (có thể thu gọn).
   - Layout tự thích ứng với màn hình Tablet, Laptop 14" và 15.6".

## Hướng Dẫn Kỹ Thuật
- Chạy local: `npm run dev`
- Build demo: `npm run build`
- Dữ liệu demo: Sử dụng bộ Mock Data sẵn có trong `/src/utils/mockGenerator.js`.
