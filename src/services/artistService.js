import api from "./api";

// Các thao tác của nghệ sĩ với bài hát của mình.

// UC28 - Bài hát của tôi
export const getMySongs = async () => (await api.get("/artist/songs")).data;

// UC26 - Tải lên bài hát (multipart/form-data, KHÔNG phải JSON)
// { title, genreId (bắt buộc, lấy từ GET /genres), audio: File, cover?: File, featuredArtistIds?: number[], releaseAt?: "YYYY-MM-DDTHH:mm:ss" }
export const uploadSong = async ({ title, genreId, audio, cover, featuredArtistIds = [], releaseAt, onUploadProgress }) => {
    const form = new FormData();
    form.append("title", title);
    form.append("genreId", String(genreId));
    form.append("audio", audio);
    if (cover) form.append("cover", cover);
    // Nhiều nghệ sĩ feat: gửi nhiều dòng cùng tên
    featuredArtistIds.forEach((id) => form.append("featuredArtistIds", id));
    if (releaseAt) form.append("releaseAt", releaseAt);
    return (
        await api.post("/artist/songs", form, {
            // để axios tự đặt boundary cho multipart
            headers: { "Content-Type": undefined },
            onUploadProgress,
        })
    ).data;
};

// UC37 - Tìm nghệ sĩ để feat
export const searchArtists = async (keyword) =>
    (await api.get("/artist/search-artists", { params: { keyword } })).data;

// UC29 - Sửa tên + danh sách feat (KHÔNG gửi genreId: thể loại không đổi được sau khi đăng)
export const updateSong = async (songId, { title, featuredArtistIds = [] }) =>
    (await api.put(`/artist/songs/${songId}`, { title, featuredArtistIds })).data;

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
