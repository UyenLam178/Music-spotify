# MySpotify – Frontend (React + Vite)

Giao diện kiểu Spotify, kết nối với backend **Spring Boot** qua REST + JWT.
Module đã đồng bộ với sơ đồ use case / class / ERD: **Module Người dùng** (UC01–UC13).
Chi tiết endpoint xem [`API_CONTRACT.md`](./API_CONTRACT.md).

## Chạy thử

```bash
npm install
cp .env.example .env      # chỉnh VITE_PROXY_TARGET nếu backend không chạy ở :8080
npm run dev               # http://localhost:5173
```

Frontend gọi `/api/...`, Vite proxy chuyển sang Spring Boot nên **không cần cấu hình CORS** khi dev.

## Cấu trúc liên quan đến module Người dùng

```
src/
├─ services/
│  ├─ api.js            axios + gắn JWT + xử lý 401 + đọc message lỗi
│  ├─ authService.js    AuthController : register, verify-otp, login, forgot/reset-password
│  ├─ userService.js    UserController : profile, avatar, password/email (OTP), disable, delete, artist
│  └─ adminService.js   AdminController: users, lock/unlock, artist-requests, assign role
├─ context/AuthContext.jsx   phiên đăng nhập (user gồm cả role)
├─ utils/                    enums.js (Role, AccountStatus…), validators.js (độ dài theo ERD)
├─ components/Auth/          LoginForm, RegisterForm, ForgotPasswordForm, VerifyOtpForm
├─ components/Profile/       ProfileInfo, Avatar, Email, Password, Artist, Account (disable/delete)
└─ pages/                    Login, Register, VerifyOtp, ForgotPassword, ResetPassword, Profile, Admin
```

| Use case | Nơi thực hiện trên UI |
|----------|-----------------------|
| 01 Đăng ký · 02 Xác thực OTP · 03 Đăng nhập | `/register` → `/verify-otp` → `/login` |
| 04 Quên mật khẩu · 05 Đặt lại mật khẩu | `/forgot-password` → `/reset-password` (OTP + mật khẩu mới) → `/login` |
| 06 Đăng xuất | Menu người dùng ở Header |
| 07–13, 14, 19 | Trang `/profile` |
| Admin (xem/khóa người dùng, duyệt nghệ sĩ, gán vai trò) | `/admin` (chỉ role ADMIN) |
