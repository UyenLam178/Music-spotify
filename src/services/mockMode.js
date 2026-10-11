// ============================================================================
// Công tắc dữ liệu mẫu (mock) cho phần nhạc — đặt trong .env:
//
//   VITE_USE_MOCK=auto  (mặc định) Luôn gọi backend trước. Endpoint nào backend
//                       trả lời được thì dùng dữ liệu THẬT và mock tự "tắt" ở
//                       endpoint đó. Mock chỉ chạy khi backend chưa có endpoint
//                       (404/405/501), lỗi server (5xx) hoặc không kết nối được.
//   VITE_USE_MOCK=on    Luôn dùng mock, không gọi backend (test/quay demo offline).
//   VITE_USE_MOCK=off   Không bao giờ dùng mock (nên đặt khi deploy thật).
//
// Mock KHÔNG BAO GIỜ trộn với dữ liệu thật: mỗi lần gọi chỉ dùng 1 trong 2.
// Đổi .env xong phải restart `npm run dev`.
// ============================================================================
const raw = String(import.meta.env.VITE_USE_MOCK ?? "auto").trim().toLowerCase();
export const MOCK_MODE = ["on", "off", "auto"].includes(raw) ? raw : "auto";

// Lỗi nào được coi là "backend chưa sẵn sàng" => cho phép dùng mock.
// 400/401/403 là backend đang trả lời thật (sai dữ liệu / chưa đăng nhập / cấm)
// nên KHÔNG fallback, tránh mock che mất lỗi phân quyền.
export const canFallback = (err) => {
    if (MOCK_MODE === "off") return false;
    if (MOCK_MODE === "on") return true;
    const status = err?.response?.status;
    return !status || [404, 405, 501].includes(status) || status >= 500;
};

// Chạy request thật; nếu được phép thì rơi về mock. Trả về { data } hoặc mock().
export const withMock = async (request, mock, label = "") => {
    if (MOCK_MODE === "on") return mock();
    try {
        return await request();
    } catch (err) {
        if (!canFallback(err)) throw err;
        console.info(`[mock] ${label || "endpoint"} chưa dùng được từ backend → dùng dữ liệu mẫu`);
        return mock();
    }
};
