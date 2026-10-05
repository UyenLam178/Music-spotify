import api, { tokenStorage } from "./api";

// UC01 Đăng ký -> backend tạo user (UNVERIFIED, role USER) và gửi OTP REGISTER qua email
export const register = async ({ username, email, password }) => {
    const { data } = await api.post("/auth/register", { username, email, password });
    return data;
};

// UC02 Xác thực Email/OTP (dùng cho đăng ký). Sai/hết hạn OTP -> backend trả 4xx + message.
export const verifyOtp = async ({ email, otp }) => {
    const { data } = await api.post("/auth/verify-otp", { email, otpCode: otp });
    return data;
};

// UC03 Đăng nhập -> LoginResponse { token, userId, username, role }
export const login = async ({ email, password }) => {
    const { data } = await api.post("/auth/login", { email, password });
    if (!data?.token) throw new Error("Backend không trả về JWT (LoginResponse.token)");
    tokenStorage.setToken(data.token);
    // Không trả token ra ngoài: nơi gọi chỉ cần userId/username/role, tránh token
    // lọt vào state React / log.
    const { token: _token, ...safe } = data; // eslint-disable-line no-unused-vars
    return safe;
};

// UC04 Quên mật khẩu -> backend gửi OTP RESET_PASSWORD tới email
// (frontend cũng gọi lại hàm này để "Gửi lại mã")
export const forgotPassword = async (email) => {
    const { data } = await api.post("/auth/forgot-password", { email });
    return data;
};

// UC05 Đặt lại mật khẩu (kèm OTP, bao gồm UC02)
export const resetPassword = async ({ email, otp, newPassword }) => {
    const { data } = await api.post("/auth/reset-password", { email, otpCode: otp, newPassword });
    return data;
};