// Tiện ích đọc JWT phía client.
//
// LƯU Ý: JWT = header.payload.signature, trong đó payload chỉ được mã hoá Base64URL
// (KHÔNG phải mã hoá bí mật). Ai có token cũng đọc được payload. Vì vậy:
//   - Backend không nên nhét email, số điện thoại... vào payload; chỉ để sub, role, exp.
//   - Frontend chỉ giải mã để đọc "exp" (hết hạn lúc nào). KHÔNG tin payload để phân quyền
//     (chữ ký chỉ backend mới kiểm tra được).

const base64UrlDecode = (str) => {
    const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    // atob trả chuỗi byte -> chuyển sang UTF-8 để không lỗi tiếng Việt
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
};

// Trả về payload (object) hoặc null nếu token sai định dạng.
export const decodeJwt = (token) => {
    try {
        const parts = String(token).split(".");
        if (parts.length !== 3) return null;
        return JSON.parse(base64UrlDecode(parts[1]));
    } catch {
        return null;
    }
};

// Thời điểm hết hạn (ms) hoặc null nếu token không có "exp".
export const getTokenExpiryMs = (token) => {
    const exp = decodeJwt(token)?.exp;
    return typeof exp === "number" ? exp * 1000 : null;
};

// skewMs: trừ hao lệch đồng hồ client/server (mặc định 5 giây)
export const isTokenExpired = (token, skewMs = 5000) => {
    const payload = decodeJwt(token);
    if (!payload) return true; // token hỏng coi như không dùng được
    const expMs = getTokenExpiryMs(token);
    return expMs !== null && Date.now() >= expMs - skewMs;
};
