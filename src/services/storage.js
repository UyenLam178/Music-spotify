// Đọc / ghi JSON an toàn vào localStorage (không văng lỗi khi đầy bộ nhớ hoặc dữ liệu hỏng).
export const readJson = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};

export const writeJson = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* bỏ qua: hết dung lượng / chế độ riêng tư */
    }
};
