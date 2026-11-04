import api from "./api";
import { toListenerSong } from "./songService";

// ============================================================================
// recommendationService.js — gợi ý bài hát (backend gọi dịch vụ AI, frontend chỉ gọi Spring Boot)
//
// Đường dẫn THẬT theo RecommendationController (khác bản đề xuất trong tài liệu):
//   GET /api/songs/{songId}/recommendations?limit=5          -> bài tương tự
//   GET /api/songs/{songId}/recommendations/artist?limit=5   -> bài cùng nghệ sĩ
//   GET /api/recommendations/genres?genreIds=1,24&limit=10   -> bài theo thể loại
// Khớp recommender.py: top_n mặc định 5; /artist lấy tối đa 3 bài cùng nghệ sĩ + bù bài nghệ sĩ khác cùng thể loại.
// Kết quả bốc ngẫu nhiên (sample) nên mỗi lần gọi có thể khác nhau => không cache.
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

export const getSimilarSongs = (songId, limit = 5, signal) =>
    fetchList(`/songs/${songId}/recommendations`, { limit }, signal);

export const getSameArtistSongs = (songId, limit = 5, signal) =>
    fetchList(`/songs/${songId}/recommendations/artist`, { limit }, signal);

export const getSongsByGenres = (genreIds, limit = 10, signal) =>
    fetchList("/recommendations/genres", { genreIds: genreIds.join(","), limit }, signal);
