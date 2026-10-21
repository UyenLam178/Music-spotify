// ============================================================================
// session.js — giữ đăng nhập, chỉ bắt đăng nhập lại khi KHÔNG hoạt động 7 ngày
//
// Lưu mốc "lần cuối dùng web" trong localStorage. Mỗi lần người dùng thao tác
// (bấm, gõ, cuộn, gọi API) mốc này được làm mới. Mở lại web mà đã quá 7 ngày kể
// từ mốc đó -> xoá phiên, yêu cầu đăng nhập lại.
//
// LƯU Ý: đây chỉ là luật nhớ đăng nhập trên giao diện; phiên đăng nhập còn có hạn riêng,
// hết hạn đó thì vẫn phải đăng nhập lại.
// ============================================================================

export const IDLE_LIMIT_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày
const KEY = "mw_last_active";
const WRITE_THROTTLE_MS = 30 * 1000; // không ghi localStorage quá dày

let lastWrite = 0;

const read = () => {
    try {
        const n = Number(localStorage.getItem(KEY));
        return Number.isFinite(n) && n > 0 ? n : null;
    } catch {
        return null;
    }
};

export const touchActivity = (force = false) => {
    const now = Date.now();
    if (!force && now - lastWrite < WRITE_THROTTLE_MS) return;
    lastWrite = now;
    try {
        localStorage.setItem(KEY, String(now));
    } catch {
        /* bỏ qua: hết dung lượng / chế độ riêng tư */
    }
};

export const clearActivity = () => {
    lastWrite = 0;
    try {
        localStorage.removeItem(KEY);
    } catch {
        /* bỏ qua */
    }
};

// true nếu đã quá 7 ngày không dùng. Người dùng cũ (chưa có mốc) được tính từ bây giờ.
export const isIdleExpired = () => {
    const last = read();
    if (last === null) {
        touchActivity(true);
        return false;
    }
    return Date.now() - last > IDLE_LIMIT_MS;
};
