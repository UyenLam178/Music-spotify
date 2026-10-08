import api from "./api";

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

// UC03 Đăng nhập -> backend set cookie HttpOnly chứa JWT, body trả { userId, username, role }.
// Frontend không đụng tới token.
export const login = async ({ email, password }) => {
    const { data } = await api.post("/auth/login", { email, password });
    // Phòng khi backend vẫn còn trả token trong body: bỏ đi, không để lọt vào state/log.
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