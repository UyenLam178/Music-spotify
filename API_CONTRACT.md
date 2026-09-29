# API Contract – Module Người dùng (User)

Hợp đồng giữa frontend và Spring Boot, suy ra từ 3 sơ đồ **use-case / class / erd** của module User
(`spotify_2026_diagram`). Backend expose đúng các endpoint dưới đây thì frontend chạy không phải sửa gì.
Nếu backend đặt path khác, chỉ cần sửa 3 file: `src/services/authService.js`, `userService.js`, `adminService.js`.

- Base URL: `/api` (dev: Vite proxy sang `http://localhost:8080`, xem `vite.config.js`)
- Body/Response: JSON (riêng avatar là `multipart/form-data`)
- Xác thực: `Authorization: Bearer <token>` (JWT – `JwtUtil` / `JwtAuthenticationFilter`)
- Lỗi: frontend hiển thị trường **`message`** của body JSON, vd `400 { "message": "Mã OTP không hợp lệ hoặc đã hết hạn" }`
- Đối tượng `User` trả về **không** chứa `password`:
  `{ id, username, email, fullName, avatarUrl, accountStatus, role, artistRequestStatus, artistName, bio }`
  - `accountStatus`: `UNVERIFIED | ACTIVE | DISABLED | DELETED`
  - `role`: `USER | ARTIST | ADMIN` · `artistRequestStatus`: `NONE | PENDING | APPROVED | REJECTED`

## 1. Guest – `AuthController`

| UC | Method & path | Request body | Response | Ghi chú |
|----|---------------|--------------|----------|---------|
| 01 Đăng ký | `POST /auth/register` | `{ username, email, password }` | `200` | Tạo user `UNVERIFIED`, role `USER`, gửi OTP `REGISTER`. Trùng email/username → `409` + `message` |
| 02 Xác thực OTP | `POST /auth/verify-otp` | `{ email, otp }` | `200` | OTP `REGISTER` đúng → `ACTIVE`. Sai/hết hạn → `4xx` + `message` |
| 03 Đăng nhập | `POST /auth/login` | `{ email, password }` | `LoginResponse { token, userId, username, role }` | Sai thông tin hoặc `accountStatus` ≠ `ACTIVE` → `401/403` + `message` |
| 04 Quên mật khẩu | `POST /auth/forgot-password` | `{ email }` | `200` | Gửi OTP `RESET_PASSWORD`. Frontend gọi lại endpoint này để "Gửi lại mã" |
| 05 Đặt lại mật khẩu | `POST /auth/reset-password` | `{ email, otp, newPassword }` | `200` | Kiểm tra **và tiêu thụ** OTP tại đây (`verifyAndConsume`) |

Luồng UI:
- Đăng ký: `/register` → `/verify-otp` → `/login`
- Quên mật khẩu: `/forgot-password` → `/reset-password` (nhập OTP + mật khẩu mới trong **một** form / **một** request) → `/login`

> Vì OTP chỉ dùng được một lần (`verifyAndConsume`), luồng quên mật khẩu **không** có bước verify riêng.

## 2. User (đã đăng nhập) – `UserController`

`userId` luôn lấy từ JWT ở backend, frontend **không** gửi `userId`.

| UC | Method & path | Request | Response |
|----|---------------|---------|----------|
| 06 Đăng xuất | `POST /users/logout` | – | `200` |
| 07 Xem thông tin | `GET /users/profile` | – | `User` |
| 08 Cập nhật thông tin | `PUT /users/profile` | `{ fullName }` | `User` |
| 10 Đổi ảnh đại diện | `PUT /users/avatar` | `multipart/form-data`, part **`file`** | `User` (`avatarUrl` có thể là đường dẫn tương đối, vd `/uploads/a.png`) |
| 09 Đổi mật khẩu – bước 1 | `POST /users/password/otp` | `{ currentPassword }` | `200` – kiểm tra mật khẩu hiện tại, gửi OTP `CHANGE_PASSWORD` (sai → `400` + `message`) |
| 09 Đổi mật khẩu – bước 2 | `PUT /users/password` | `{ otp, newPassword }` | `200` |
| 13 Đổi email – bước 1 | `POST /users/email/otp` | `{ newEmail }` | `200` – kiểm tra email chưa dùng, gửi OTP `CHANGE_EMAIL` tới **email mới**, lưu `new_email` |
| 13 Đổi email – bước 2 | `PUT /users/email` | `{ otp }` | `200` – email mới lấy từ bản ghi OTP |
| 11 Vô hiệu hóa | `PUT /users/disable` | `{ currentPassword }` | `200` → `DISABLED` |
| 12 Xóa tài khoản | `DELETE /users` | `{ currentPassword }` (body của DELETE) | `200` → `DELETED` (xóa mềm) |
| 14 Yêu cầu làm nghệ sĩ | `POST /users/artist-request` | `{ artistName, bio }` | `200` → `artistRequestStatus = PENDING` |
| 19 Cập nhật hồ sơ nghệ sĩ | `PUT /users/artist-profile` | `{ artistName, bio }` | `User` (chỉ role `ARTIST`) |

## 3. Admin – `AdminController` (`hasRole('ADMIN')`)

| Chức năng | Method & path | Body | Response |
|-----------|---------------|------|----------|
| Xem tất cả người dùng | `GET /admin/users` | – | `User[]` (hoặc `Page{content}`) |
| Khóa tài khoản | `PUT /admin/users/{id}/lock` | – | `200` |
| Mở khóa tài khoản | `PUT /admin/users/{id}/unlock` | – | `200` |
| Yêu cầu nghệ sĩ chờ duyệt | `GET /admin/artist-requests` | – | `User[]` có `artistRequestStatus = PENDING` |
| Duyệt yêu cầu | `PUT /admin/artist-requests/{id}/approve` | – | `200` → `APPROVED`, role `ARTIST` |
| Từ chối yêu cầu | `PUT /admin/artist-requests/{id}/reject` | – | `200` → `REJECTED` |
| Gán vai trò | `PUT /admin/users/{id}/role` | `{ role }` | `200` |

Frontend chỉ hiện trang `/admin` và mục "Quản trị" trong menu khi `role === ADMIN`
(chỉ để ẩn giao diện – việc chặn quyền thật sự vẫn phải làm ở backend).

## 4. Điểm sơ đồ chưa quy định rõ (frontend đã chọn như sau)

1. **Sơ đồ use-case chưa cập nhật**: chỉ có UC01–13, trong khi class diagram / ERD đã có UC14 (yêu cầu nghệ sĩ),
   UC15–18 (Admin), UC19 (hồ sơ nghệ sĩ). Frontend làm theo class diagram + ERD (bản đầy đủ hơn).
2. **Path endpoint** ở trên là quy ước của frontend (sơ đồ chỉ có tên method).
3. **`lockAccount`**: giả định chuyển `accountStatus` sang `DISABLED` (sơ đồ không có trạng thái LOCKED);
   `unlockAccount` chuyển về `ACTIVE`. UI chỉ hiện nút Khóa/Mở khóa cho tài khoản `ACTIVE`/`DISABLED`.
4. **Gửi lại OTP đăng ký**: không có API trong sơ đồ nên UI chỉ có nút "Gửi lại mã" ở luồng quên mật khẩu.
   Người dùng đăng ký nhưng OTP hết hạn sẽ không tự xác thực lại được – nên bổ sung API này ở backend.
5. **Token hết hạn**: frontend xóa phiên khi nhận `401` (mọi endpoint ngoài `/auth/**`); riêng lúc mở app, `401/403`
   từ `GET /users/profile` đều bị coi là token không hợp lệ.
6. **CORS**: dev không cần (Vite proxy). Deploy gọi thẳng backend (`VITE_API_BASE_URL`) thì phải bật CORS ở `SecurityConfig`.
7. **Validate UI** (nên đồng bộ với backend, nằm ở `src/utils/validators.js`): độ dài tối đa theo ERD
   (username 50, email 100, full_name 100, artist_name 100, bio 255, otp 10); mật khẩu 6–20 ký tự có hoa/thường/số;
   username 3–50 ký tự không khoảng trắng.

## 5. Khác biệt so với frontend gốc

| Bản gốc | Bản mới |
|---------|---------|
| Đăng ký bằng `name` | `username` |
| `displayName`, phone, ngày sinh, giới tính, bio (hồ sơ) | Chỉ `fullName`; `artistName`+`bio` chỉ cho nghệ sĩ |
| Access + refresh token, auto-refresh | 1 JWT (`LoginResponse.token`) |
| Đăng nhập Google/Facebook/Spotify | Bỏ |
| Reset mật khẩu bằng link chứa token | OTP: `email + otp + newPassword` |
| Đổi mật khẩu chỉ cần mật khẩu cũ | Mật khẩu hiện tại → OTP email → mật khẩu mới + xác nhận |
| Avatar nhập URL | Upload file ảnh |
| Đổi email bằng mật khẩu | OTP gửi tới email mới |
| Xóa tài khoản (mật khẩu) | Vô hiệu hóa **và** xóa tài khoản, đều nhập mật khẩu hiện tại |
| Chưa có | Trang `/verify-otp`, mục "Trở thành nghệ sĩ" / hồ sơ nghệ sĩ, trang `/admin`, phân quyền theo `role` |

Phần nhạc (bài hát, album, nghệ sĩ, playlist, tìm kiếm) không thuộc sơ đồ này nên giữ nguyên;
các service nhạc vẫn fallback về `mockData` khi backend chưa có endpoint.
