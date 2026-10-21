import axios from "axios";
import i18n from "i18next";
import { isTokenExpired } from "../utils/jwt";
import { clearActivity, touchActivity } from "./session";

// ---------------------------------------------------------------------------
// Axios instance dùng chung cho toàn bộ frontend.
//
// Mặc định gọi "/api/...". Khi deploy có thể đặt VITE_API_BASE_URL=https://domain-api/api
// ---------------------------------------------------------------------------
export const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

const TOKEN_KEY = "mw_access_token";
// Khoá cũ của bản có refresh-token; dọn đi để không để rác trong localStorage.
const LEGACY_REFRESH_KEY = "mw_refresh_token";

// Chỉ dùng 1 token đăng nhập (không có refresh token).
export const tokenStorage = {
    getToken: () => localStorage.getItem(TOKEN_KEY),
    setToken: (token) => {
        localStorage.setItem(TOKEN_KEY, token);
        touchActivity(true); // bắt đầu tính 7 ngày không hoạt động từ lúc đăng nhập
    },
    clear: () => {
        localStorage.removeItem(TOKEN_KEY);
        clearActivity();
        localStorage.removeItem(LEGACY_REFRESH_KEY);
    },
};

const api = axios.create({
    baseURL: BASE_URL,
    headers: { "Content-Type": "application/json" },
});

// Gắn token đăng nhập vào mỗi request.
api.interceptors.request.use((config) => {
    const token = tokenStorage.getToken();
    if (token) {
        touchActivity(); // gọi API = đang dùng web
        // Token đã hết hạn (đọc "exp" trong payload) -> khỏi gửi đi, xoá phiên luôn.
        if (isTokenExpired(token)) {
            tokenStorage.clear();
            window.dispatchEvent(new CustomEvent("mw:auth-expired"));
        } else {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Token hết hạn / không hợp lệ (401) => xoá phiên và báo cho AuthContext.
// Bỏ qua các request đăng nhập / đăng ký vì ở đó 401 chỉ nghĩa là "sai email/mật khẩu".
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const url = error.config?.url || "";
        if (status === 401 && tokenStorage.getToken() && !url.includes("/auth/")) {
            tokenStorage.clear();
            window.dispatchEvent(new CustomEvent("mw:auth-expired"));
        }
        return Promise.reject(error);
    }
);

// Lấy thông báo lỗi dễ đọc từ phản hồi lỗi.
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
    // Phản hồi lỗi mặc định ({timestamp,status,error,path}) không có nội dung hữu ích cho người dùng
    if (typeof data.error === "string") return defaultMsg;
    const firstKey = Object.keys(data).find((k) => typeof data[k] === "string");
    return firstKey ? data[firstKey] : defaultMsg;
};

// Ảnh / video có thể có đường dẫn tương đối ("/uploads/a.png").
// Hàm này biến nó thành URL dùng được trong <img>.
export const resolveAssetUrl = (url) => {
    if (!url) return "";
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    let origin = "";
    if (/^https?:/i.test(BASE_URL)) origin = new URL(BASE_URL).origin;
    return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
};

export default api;
