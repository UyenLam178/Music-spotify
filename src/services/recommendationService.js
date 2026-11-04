import api from "./api";
import { toListenerSong } from "./songService";

// ============================================================================
// recommendationService.js — gợi ý bài hát (backend gọi dịch vụ AI, frontend chỉ gọi Spring Boot)
//
// Đường dẫn THẬT theo RecommendationController:
//   GET /api/songs/{songId}/recommendations?limit=5&excludeIds=7,22  -> bài đề xuất sau 1 bài, tính thẳng từ MySQL:
//        tối đa 3 bài cùng nghệ sĩ (ưu tiên cùng thể loại) -> bài cùng thể loại của nghệ sĩ khác -> bài nhiều lượt nghe nhất của nghệ sĩ khác.
//        limit=5 cho mục "Bài hát đề xuất"; limit=10 cho danh sách phát tiếp khi nghe hết bài.
//   GET /api/songs/{songId}/recommendations/artist?limit=5           -> bài của cùng nghệ sĩ (đã nằm trong API trên, frontend không dùng nữa)
//   GET /api/recommendations/genres?genreIds=1,24&limit=10           -> bài theo thể loại (dịch vụ AI Python)
// Cả 3 trả về mảng bài hát cùng dạng với GET /api/songs. Cần đăng nhập (token gắn tự động ở api.js).
// Gợi ý chỉ là phần phụ: lỗi hoặc rỗng => trả [] để giao diện ẩn mục, không làm vỡ trang.
// ============================================================================

const fetchList = async (path, params, signal) => {
    try {
        const { data } = await api.get(path, { params, signal });
        return (Array.isArray(data) ? data : []).map(toListenerSong).filter(Boolean);
    } catch (err) {
        if (err?.code === "ERR_CANCELED") throw err; // người dùng đã chuyển bài: để nơi gọi bỏ qua
        return [];
    }
};

// excludeIds: các bài không muốn nhận lại (vd bài vừa phát xong) -> ?excludeIds=7,22
export const getSimilarSongs = (songId, limit = 5, signal, excludeIds = []) =>
    fetchList(
        `/songs/${songId}/recommendations`,
        { limit, ...(excludeIds.length ? { excludeIds: excludeIds.join(",") } : {}) },
        signal
    );

export const getSameArtistSongs = (songId, limit = 5, signal) =>
    fetchList(`/songs/${songId}/recommendations/artist`, { limit }, signal);

export const getSongsByGenres = (genreIds, limit = 10, signal) =>
    fetchList("/recommendations/genres", { genreIds: genreIds.join(","), limit }, signal);
