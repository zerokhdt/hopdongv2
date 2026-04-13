## Firebase Setup (ACE HRM)

### 1) Tạo project Firebase
- Truy cập [Firebase Console](https://console.firebase.google.com/) và tạo project mới.
- Bật **Firestore Database** và **Authentication** (Email/Password).

### 2) Cấu hình Service Account cho API (Vercel)
- Vào **Project Settings** > **Service accounts**.
- Nhấn **Generate new private key** để tải file JSON.
- Copy nội dung file JSON này vào biến môi trường `FIREBASE_SERVICE_ACCOUNT` trên Vercel.

### 3) Cấu hình env cho Web (Frontend)
Cần các biến sau trong `.env` hoặc cấu hình Vercel:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### 4) Seed dữ liệu ban đầu
- Đảm bảo đã có file `.env` chứa `FIREBASE_SERVICE_ACCOUNT`.
- Chạy script tạo user admin:
```bash
node scripts/firebase_seed_users.mjs
```
- Seed danh sách nhân sự từ CSV:
```bash
node scripts/firebase_seed_employees_from_csv.mjs demo_nhan_su_mock.csv
```
