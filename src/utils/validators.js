// Quy tắc validate phía frontend.
// Độ dài tối đa lấy từ ERD (bảng users):
//   username VARCHAR(50), email VARCHAR(100), full_name VARCHAR(100),
//   otp_code VARCHAR(10), artist_name VARCHAR(100), bio VARCHAR(255)
// Các quy tắc còn lại (độ dài tối thiểu, độ mạnh mật khẩu) là quy ước của UI;
// nếu backend siết/nới khác đi thì chỉ cần sửa tại file này.

export const LIMITS = {
    USERNAME_MIN: 3,
    USERNAME_MAX: 50,
    EMAIL_MAX: 100,
    FULL_NAME_MAX: 100,
    ARTIST_NAME_MAX: 100,
    BIO_MAX: 255,
    OTP_MAX: 10,
    AVATAR_MAX_BYTES: 5 * 1024 * 1024,
};

export const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
// 6-20 ký tự, có chữ hoa, chữ thường và số
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,20}$/;
export const OTP_REGEX = /^[A-Za-z0-9]{4,10}$/;

// Mỗi hàm trả về KEY i18n của lỗi (hoặc "" nếu hợp lệ) -> dùng với t(key).
export const validateUsername = (value = "") => {
    const v = value.trim();
    if (!v) return "validation.usernameRequired";
    if (/\s/.test(v)) return "validation.usernameNoSpaces";
    if (v.length < LIMITS.USERNAME_MIN || v.length > LIMITS.USERNAME_MAX) return "validation.usernameLength";
    return "";
};

export const validateEmail = (value = "") => {
    const v = value.trim();
    if (!v) return "validation.emailRequired";
    if (!EMAIL_REGEX.test(v) || v.length > LIMITS.EMAIL_MAX) return "validation.emailInvalid";
    return "";
};

export const validateNewPassword = (value = "") =>
    PASSWORD_REGEX.test(value) ? "" : "validation.passwordComplexity";

export const validateConfirmPassword = (confirm = "", password = "") => {
    if (!confirm) return "validation.confirmPasswordRequired";
    if (confirm !== password) return "validation.confirmPasswordMismatch";
    return "";
};

export const validateOtp = (value = "") => {
    const v = value.trim();
    if (!v) return "validation.otpRequired";
    if (!OTP_REGEX.test(v)) return "validation.otpInvalidFormat";
    return "";
};

export const validateFullName = (value = "") =>
    value.trim().length > LIMITS.FULL_NAME_MAX ? "validation.fullNameLength" : "";

export const validateArtistName = (value = "") => {
    const v = value.trim();
    if (!v) return "validation.artistNameRequired";
    if (v.length > LIMITS.ARTIST_NAME_MAX) return "validation.artistNameLength";
    return "";
};

export const validateBio = (value = "") =>
    value.length > LIMITS.BIO_MAX ? "validation.bioLength" : "";
