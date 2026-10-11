import api from "./api";
import { MOCK_MODE, canFallback, withMock } from "./mockMode";
import { mockGenres } from "./mockData";

// ============================================================================
// Thể loại nhạc (genre). ADMIN quản lý, mọi người dùng đều đọc được.
//
//   GET    /api/genres                -> [{ id, name, color }]    (công khai)
//   POST   /api/admin/genres          { name, color }
//   PUT    /api/admin/genres/{id}     { name, color }
//   DELETE /api/admin/genres/{id}
//
// Backend trả lời được => dùng dữ liệu thật, bỏ qua hoàn toàn bản lưu cục bộ.
// Chỉ khi mock được phép (xem mockMode.js) mới dùng danh sách mẫu lưu ở
// localStorage để thêm/sửa/xoá khi demo.
// ============================================================================
const KEY = "mw_genres";

const readLocal = () => {
    try {
        const list = JSON.parse(localStorage.getItem(KEY) || "null");
        if (Array.isArray(list)) return list;
    } catch {
        /* dùng dữ liệu mẫu */
    }
    return mockGenres;
};
const writeLocal = (list) => {
    try {
        localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
        /* bỏ qua */
    }
    return list;
};

const changed = (r) => {
    window.dispatchEvent(new Event("mw:genres-changed"));
    return r;
};

// color: "RRGGBB" (không có #) — khớp cách Search.jsx đang dùng
export const normalizeColor = (c) => String(c || "535353").replace("#", "").slice(0, 6);

export const getGenres = async () => {
    try {
        const { data } = await withMock(() => api.get("/genres"), () => ({ data: readLocal() }), "/genres");
        const list = Array.isArray(data) ? data : data?.content;
        return Array.isArray(list) ? list.map((g) => ({ ...g, color: normalizeColor(g.color) })) : [];
    } catch (error) {
        console.error("Không tải được /genres:", error?.response?.status ?? error.message);
        return [];
    }
};

// Ghi: backend thật trước; chỉ ghi cục bộ khi mock được phép (on, hoặc auto mà
// backend chưa có endpoint). 401/403/400 vẫn ném lỗi để UI báo cho admin.
const write = async (request, local) => {
    if (MOCK_MODE === "on") return changed(local());
    try {
        return changed((await request()).data);
    } catch (err) {
        if (!canFallback(err)) throw err;
        return changed(local());
    }
};

export const createGenre = ({ name, color }) =>
    write(
        () => api.post("/admin/genres", { name, color }),
        () => {
            const genre = { id: `g${Date.now()}`, name, color: normalizeColor(color) };
            writeLocal([...readLocal(), genre]);
            return genre;
        }
    );

export const updateGenre = (id, { name, color }) =>
    write(
        () => api.put(`/admin/genres/${id}`, { name, color }),
        () => {
            const list = readLocal().map((g) =>
                String(g.id) === String(id) ? { ...g, name, color: normalizeColor(color) } : g
            );
            writeLocal(list);
            return list.find((g) => String(g.id) === String(id));
        }
    );

export const deleteGenre = (id) =>
    write(
        () => api.delete(`/admin/genres/${id}`),
        () => {
            writeLocal(readLocal().filter((g) => String(g.id) !== String(id)));
            return { message: "deleted" };
        }
    );
