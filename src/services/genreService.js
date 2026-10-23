import api from "./api";

// ============================================================================
// genreService.js
//
// Thể loại lấy từ backend: GET /api/genres -> [{ id, name }] (25 thể loại, đã xếp A→Z).
// Không có API thêm / sửa / xóa thể loại. KHÔNG hardcode id: id có thể khác nhau
// giữa các môi trường.
//
// Backend không trả màu, nên màu ô thể loại được suy ra từ id (cố định cho mỗi id).
// ============================================================================

export const GENRE_PALETTE = [
    "8D67AB", "E1118C", "1E3264", "148A08", "BC5900", "477D95", "509BF5", "E8115B", "D84000",
    "1DB954", "F59B23", "535353", "7358FF", "0D73EC", "AF2896", "BA5D07", "608108", "E13300",
    "27856A", "8C1932", "2D46B9", "A56752", "503750", "006450", "DC148C",
];

export const genreColor = (id) => {
    const n = Number(id);
    if (!Number.isFinite(n)) return "535353";
    return GENRE_PALETTE[Math.abs(n) % GENRE_PALETTE.length];
};

const withColor = (g) => ({ id: g.id, name: g.name, color: genreColor(g.id) });

// Danh sách gần như không đổi -> gọi 1 lần, dùng chung cho form đăng bài và trang Genres.
// Gọi lỗi thì bỏ cache để lần sau thử lại.
let cache = null;

export const getGenres = () => {
    if (!cache) {
        cache = api
            .get("/genres")
            .then(({ data }) => (Array.isArray(data) ? data : []).map(withColor))
            .catch((err) => {
                cache = null;
                throw err;
            });
    }
    return cache;
};

export const getGenreById = async (id) => (await getGenres()).find((g) => String(g.id) === String(id)) || null;
