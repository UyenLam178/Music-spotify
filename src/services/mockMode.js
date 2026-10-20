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
// - Không có phản hồi (mất mạng/CORS), 404/405/501, 5xx: luôn cho phép (auto).
// - 401/403: chỉ cho phép khi ĐỌC dữ liệu nhạc (readOnly), vì guest chưa đăng
//   nhập thường bị backend từ chối => không muốn trang trống. Khi GHI (thêm/sửa/xoá
//   thể loại...) vẫn KHÔNG fallback để mock không che mất lỗi phân quyền.
// - err.invalid: backend trả 200 nhưng sai dạng (vd: trả về trang HTML) => cho phép.
export const canFallback = (err, readOnly = false) => {
    if (MOCK_MODE === "off") return false;
    if (MOCK_MODE === "on") return true;
    if (err?.invalid) return true;
    const status = err?.response?.status;
    if (readOnly && (status === 401 || status === 403)) return true;
    return !status || [404, 405, 501].includes(status) || status >= 500;
};

// Chạy request thật; nếu được phép thì rơi về mock.
// validate (tuỳ chọn): kiểm tra dữ liệu backend trả về; sai dạng => coi như chưa có endpoint.
// Dùng cho các hàm ĐỌC => readOnly = true.
export const withMock = async (request, mock, label = "", validate) => {
    if (MOCK_MODE === "on") return mock();
    try {
        const res = await request();
        if (validate && !validate(res?.data)) {
            const e = new Error("Phản hồi backend sai dạng");
            e.invalid = true;
            throw e;
        }
        return res;
    } catch (err) {
        if (!canFallback(err, true)) throw err;
        console.info(`[mock] ${label || "endpoint"} chưa dùng được từ backend → dùng dữ liệu mẫu`);
        return mock();
    }
};
