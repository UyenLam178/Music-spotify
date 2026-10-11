import api from "./api";

// API dành cho ARTIST (backend: ArtistSongController, prefix /api/artist).
// SongManageResponse: { id, title, audioUrl, coverUrl, durationSeconds, playCount,
//   status, released, releaseAt, rejectReason, artistId, artistName,
//   featuredArtists: [{ id, artistName }], createdAt, updatedAt }

// UC28 - Bài hát của tôi
export const getMySongs = async () => (await api.get("/artist/songs")).data;

// UC26 - Tải lên bài hát (multipart/form-data, KHÔNG phải JSON)
// { title, audio: File, cover?: File, featuredArtistIds?: number[], releaseAt?: "YYYY-MM-DDTHH:mm:ss" }
export const uploadSong = async ({ title, audio, cover, featuredArtistIds = [], releaseAt, genreId }) => {
    const form = new FormData();
    form.append("title", title);
    form.append("audio", audio);
    if (cover) form.append("cover", cover);
    // Spring bind List<Long>: gửi nhiều dòng cùng tên
    featuredArtistIds.forEach((id) => form.append("featuredArtistIds", id));
    if (releaseAt) form.append("releaseAt", releaseAt);
    // Backend hiện chưa nhận thể loại (bỏ qua trường lạ); khi có sẽ tự dùng.
    if (genreId) form.append("genreId", genreId);
    return (
        await api.post("/artist/songs", form, {
            // để axios tự đặt boundary cho multipart
            headers: { "Content-Type": undefined },
        })
    ).data;
};

// UC37 - Tìm nghệ sĩ để feat
export const searchArtists = async (keyword) =>
    (await api.get("/artist/search-artists", { params: { keyword } })).data;

// UC29 - Sửa tên + danh sách feat
export const updateSong = async (songId, { title, featuredArtistIds = [], genreId }) =>
    (await api.put(`/artist/songs/${songId}`, { title, featuredArtistIds, genreId: genreId || null })).data;

// Thể loại của bài hát: backend chưa lưu nên ghi nhớ cục bộ (songId -> genreId)
// để Studio vẫn hiển thị và sắp xếp được. Ưu tiên genreId do backend trả về.
const GENRE_KEY = "mw_song_genres";
const readGenres = () => {
    try {
        return JSON.parse(localStorage.getItem(GENRE_KEY) || "{}");
    } catch {
        return {};
    }
};
export const getSongGenre = (song) => song.genreId ?? song.genre?.id ?? readGenres()[song.id] ?? "";
export const setSongGenre = (songId, genreId) => {
    try {
        const map = readGenres();
        if (genreId) map[songId] = genreId;
        else delete map[songId];
        localStorage.setItem(GENRE_KEY, JSON.stringify(map));
    } catch {
        /* bỏ qua */
    }
};

// UC30 - Đổi ảnh bìa
export const updateCover = async (songId, cover) => {
    const form = new FormData();
    form.append("cover", cover);
    return (
        await api.put(`/artist/songs/${songId}/cover`, form, {
            headers: { "Content-Type": undefined },
        })
    ).data;
};

// UC31 - Đổi lịch phát hành (releaseAt = null → phát hành ngay)
export const updateRelease = async (songId, releaseAt) =>
    (await api.put(`/artist/songs/${songId}/release`, { releaseAt: releaseAt || null })).data;

// UC32 - Ẩn / hiện lại
export const hideSong = async (songId) => (await api.put(`/artist/songs/${songId}/hide`)).data;
export const showSong = async (songId) => (await api.put(`/artist/songs/${songId}/show`)).data;

// UC33 - Xóa bài
export const deleteSong = async (songId) => (await api.delete(`/artist/songs/${songId}`)).data;
