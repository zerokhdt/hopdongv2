## 2026-04-19

- Thêm API movements trên Firebase Functions: GET `/api/movements/my|pending|list`, POST `/api/movements/create|decide`.
- Lưu dữ liệu biến động nhân sự vào Firestore collection `personnel_movements` và audit subcollection `personnel_movements/{id}/audit`.
- Đồng bộ `local_token_` session bypass cho Firebase Functions để chạy được với LoginView preview.
- Thêm API candidates-sheet trên Firebase Functions để GAS sync lên Supabase: POST `/api/candidates-sheet/upsert`, GET `/api/candidates-sheet/list`.
