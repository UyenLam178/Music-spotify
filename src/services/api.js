import axios from "axios";
import i18n from "i18next";

// ---------------------------------------------------------------------------
// Axios instance dùng chung cho toàn bộ frontend.
//
// Mặc định gọi "/api/..." (Vite proxy sang Spring Boot, xem vite.config.js).
// Khi deploy có thể đặt VITE_API_BASE_URL=https://domain-backend/api
// ---------------------------------------------------------------------------
export const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

// JWT nằm trong cookie HttpOnly do backend set (Set-Cookie ở /auth/login).
// JavaScript KHÔNG đọc được cookie này => XSS không lấy trộm được token, và
// frontend không cần tự lưu / tự gắn header Authorization.
// Trình duyệt tự gửi cookie theo mỗi request nhờ `withCredentials: true`.

// Dọn token cũ của bản trước (lưu localStorage) để không để rác.
try {
    localStorage.removeItem("mw_access_token");
    localStorage.removeItem("mw_refresh_token");
} catch { /* bỏ qua */ }

const api = axios.create({
    baseURL: BASE_URL,
    headers: { "Content-Type": "application/json" },
    withCredentials: true,
});

// Cookie hết hạn / không hợp lệ (401) => báo cho AuthContext đưa người dùng về trạng thái chưa đăng nhập.
// Bỏ qua các endpoint /auth/** vì ở đó 401 chỉ nghĩa là "sai email/mật khẩu".
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const url = error.config?.url || "";
        if (status === 401 && !url.includes("/auth/")) {
            window.dispatchEvent(new CustomEvent("mw:auth-expired"));
        }
        return Promise.reject(error);
    }
);

// Lấy thông báo lỗi dễ đọc từ response của Spring Boot.
// Hỗ trợ: "chuỗi", { message }, { error }, { errors: [...] } (validation),
// hoặc map { field: "thông báo" }.
export const extractErrorMessage = (error, fallback) => {
    const defaultMsg = fallback || i18n.t("common.errorDefault");
    if (error?.response === undefined && error?.request) {
        return i18n.t("common.networkError");
    }
    const data = error?.response?.data;
    if (!data) return error?.message || defaultMsg;
    if (typeof data === "string") return data || defaultMsg;
    if (data.message) return data.message;
    if (Array.isArray(data.errors) && data.errors.length) {
        return data.errors.map((e) => e.defaultMessage || e.message || e).join(", ");
    }
    // Body mặc định của Spring ({timestamp,status,error,path}) không có nội dung hữu ích cho người dùng
    if (typeof data.error === "string") return defaultMsg;
    const firstKey = Object.keys(data).find((k) => typeof data[k] === "string");
    return firstKey ? data[firstKey] : defaultMsg;
};

// Avatar backend có thể trả về đường dẫn tương đối ("/uploads/a.png").
// Hàm này biến nó thành URL dùng được trong <img>.
export const resolveAssetUrl = (url) => {
    if (!url) return "";
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    let origin = "";
    if (/^https?:/i.test(BASE_URL)) origin = new URL(BASE_URL).origin;
    return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
};

export default api;
