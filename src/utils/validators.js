// Quy tắc validate phía frontend — KHỚP với validation ở backend (RegisterRequest,
// ResetPasswordRequest, ChangePasswordRequest, VerifyOtpRequest):
//   username : 5–20 ký tự, chỉ chữ/số/dấu chấm/gạch dưới
//   email    : tối đa 100 ký tự
//   password : 6–72 ký tự (backend) + quy ước của UI: có CHỮ HOA, SỐ và KÝ TỰ ĐẶC BIỆT
//   otp      : đúng 6 chữ số
// Nếu backend siết/nới khác đi thì chỉ cần sửa tại file này.

export const LIMITS = {
    USERNAME_MIN: 5,
    USERNAME_MAX: 20,
    EMAIL_MAX: 100,
    FULL_NAME_MAX: 100,
    ARTIST_NAME_MAX: 100,
    BIO_MAX: 255,
    OTP_LENGTH: 6,
    OTP_MAX: 6,
    PASSWORD_MIN: 6,
    PASSWORD_MAX: 72,
    AVATAR_MAX_BYTES: 5 * 1024 * 1024,
};

export const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
export const USERNAME_REGEX = /^[a-zA-Z0-9_.]+$/;
export const OTP_REGEX = /^\d{6}$/;

// Các quy tắc mật khẩu mới (dùng cho kiểm tra + danh sách tick xanh trên form).
// "Ký tự đặc biệt" = mọi ký tự không phải chữ cái / chữ số / khoảng trắng.
export const PASSWORD_RULES = [
    { id: "length", labelKey: "validation.pwRuleLength", test: (v) => v.length >= LIMITS.PASSWORD_MIN && v.length <= LIMITS.PASSWORD_MAX },
    { id: "upper", labelKey: "validation.pwRuleUpper", test: (v) => /\p{Lu}/u.test(v) },
    { id: "digit", labelKey: "validation.pwRuleDigit", test: (v) => /\d/.test(v) },
    { id: "special", labelKey: "validation.pwRuleSpecial", test: (v) => /[^\p{L}\p{N}\s]/u.test(v) },
    { id: "noSpace", labelKey: "validation.pwRuleNoSpace", test: (v) => !/\s/.test(v) },
];
export const isStrongPassword = (value = "") => PASSWORD_RULES.every((r) => r.test(value));

// Mỗi hàm trả về KEY i18n của lỗi (hoặc "" nếu hợp lệ) -> dùng với t(key).
export const validateUsername = (value = "") => {
    const v = value.trim();
    if (!v) return "validation.usernameRequired";
    if (/\s/.test(v)) return "validation.usernameNoSpaces";
    if (v.length < LIMITS.USERNAME_MIN || v.length > LIMITS.USERNAME_MAX) return "validation.usernameLength";
    if (!USERNAME_REGEX.test(v)) return "validation.usernamePattern";
    return "";
};

export const validateEmail = (value = "") => {
    const v = value.trim();
    if (!v) return "validation.emailRequired";
    if (!EMAIL_REGEX.test(v) || v.length > LIMITS.EMAIL_MAX) return "validation.emailInvalid";
    return "";
};

export const validateNewPassword = (value = "") =>
    isStrongPassword(value) ? "" : "validation.passwordComplexity";

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
