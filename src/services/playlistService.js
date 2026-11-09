import api, { resolveAssetUrl } from "./api";
import { toListenerSong } from "./songService";

// ============================================================================
// playlistService.js — khớp với PlaylistController (backend): /api/playlists
//
//   POST   /playlists                         multipart: name, description, isPublic, songIds (lặp), cover (file)
//   GET    /playlists/me                      -> PlaylistSummaryResponse[]
//   GET    /playlists/users/{userId}          -> playlist công khai của 1 người
//   GET    /playlists/{id}                    -> PlaylistDetailResponse (songs: [{ song, addedAt }])
//   PUT    /playlists/{id}                    JSON { name, description, isPublic }
//   PUT    /playlists/{id}/cover              multipart: cover
//   DELETE /playlists/{id}/cover
//   POST   /playlists/{id}/songs/{songId}
//   DELETE /playlists/{id}/songs/{songId}
//   DELETE /playlists/{id}
//
// Dữ liệu trả về được chuẩn hoá: thêm `coverImageUrl` (URL ảnh bìa dùng được trong <img>)
// và `songs` là mảng bài hát phẳng (cùng dạng với các trang khác) để SongRow dùng được ngay.
// ============================================================================

export const MAX_PLAYLISTS = 50;
export const MAX_SONGS_PER_PLAYLIST = 200;
export const MAX_COVER_BYTES = 2 * 1024 * 1024;
export const COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Báo cho Sidebar (danh sách playlist bên trái) tải lại sau mỗi thay đổi.
export const PLAYLISTS_CHANGED = "mw:playlists-changed";
const notifyChanged = () => window.dispatchEvent(new CustomEvent(PLAYLISTS_CHANGED));

const normalizePlaylist = (p) => {
    if (!p) return p;
    const out = { ...p, coverImageUrl: p.coverUrl ? resolveAssetUrl(p.coverUrl) : "" };
    if (Array.isArray(p.songs)) {
        out.songs = p.songs
            .filter((item) => item?.song)
            .map((item) => ({ ...toListenerSong(item.song), addedAt: item.addedAt }));
    }
    return out;
};

export const getMyPlaylists = async () => {
    const { data } = await api.get("/playlists/me");
    return (Array.isArray(data) ? data : []).map(normalizePlaylist);
};

export const getPublicPlaylists = async (userId) => {
    const { data } = await api.get(`/playlists/users/${userId}`);
    return (Array.isArray(data) ? data : []).map(normalizePlaylist);
};

export const getPlaylistById = async (playlistId) => {
    const { data } = await api.get(`/playlists/${playlistId}`);
    return normalizePlaylist(data);
};

// Backend nhận multipart/form-data và bắt buộc có ít nhất 1 bài (songIds).
// songIds: mảng id bài hát · cover: File ảnh (tuỳ chọn)
export const createPlaylist = async ({ name, description = "", isPublic = true, songIds = [], cover = null }) => {
    const form = new FormData();
    form.append("name", name);
    form.append("description", description || "");
    form.append("isPublic", String(!!isPublic));
    songIds.forEach((id) => form.append("songIds", String(id)));
    if (cover) form.append("cover", cover);
    const { data } = await api.post("/playlists", form, { headers: { "Content-Type": undefined } });
    notifyChanged();
    return normalizePlaylist(data);
};

// UpdatePlaylistRequest { name, description, isPublic }
export const updatePlaylist = async (playlistId, { name, description = "", isPublic = true }) => {
    const { data } = await api.put(`/playlists/${playlistId}`, { name, description, isPublic });
    notifyChanged();
    return normalizePlaylist(data);
};

export const updatePlaylistCover = async (playlistId, file) => {
    const form = new FormData();
    form.append("cover", file);
    const { data } = await api.put(`/playlists/${playlistId}/cover`, form, { headers: { "Content-Type": undefined } });
    notifyChanged();
    return normalizePlaylist(data);
};

export const removePlaylistCover = async (playlistId) => {
    const { data } = await api.delete(`/playlists/${playlistId}/cover`);
    notifyChanged();
    return normalizePlaylist(data);
};

export const deletePlaylist = async (playlistId) => {
    const { data } = await api.delete(`/playlists/${playlistId}`);
    notifyChanged();
    return data;
};

export const addSongToPlaylist = async (playlistId, songId) => {
    const { data } = await api.post(`/playlists/${playlistId}/songs/${songId}`);
    notifyChanged();
    return normalizePlaylist(data);
};

export const removeSongFromPlaylist = async (playlistId, songId) => {
    const { data } = await api.delete(`/playlists/${playlistId}/songs/${songId}`);
    notifyChanged();
    return normalizePlaylist(data);
};

export default {
    getMyPlaylists,
    getPublicPlaylists,
    getPlaylistById,
    createPlaylist,
    updatePlaylist,
    updatePlaylistCover,
    removePlaylistCover,
    deletePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
};
