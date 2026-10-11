import api, { tokenStorage } from "./api";
import { decodeJwt } from "../utils/jwt";
import { MOCK_MODE, canFallback } from "./mockMode";

// ============================================================================
// Playlist cho USER và ARTIST (ADMIN không có playlist).
//
// Ưu tiên gọi backend (/api/playlists...). Backend hiện CHƯA có API playlist
// nên khi request lỗi (404/405/5xx/mất mạng) service tự chuyển sang LƯU CỤC BỘ
// trong localStorage theo từng tài khoản. Khi backend bổ sung API, không cần
// sửa gì: lần gọi sau sẽ dùng dữ liệu thật.
// (Playlist lưu cục bộ chỉ tồn tại trong trình duyệt này.)
// ============================================================================

const owner = () => decodeJwt(tokenStorage.getToken() || "")?.sub || "guest";
const key = () => `mw_local_playlists_${owner()}`;

const readAll = () => {
    try {
        const list = JSON.parse(localStorage.getItem(key()) || "[]");
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
};
const writeAll = (list) => {
    try {
        localStorage.setItem(key(), JSON.stringify(list));
    } catch {
        /* localStorage không dùng được */
    }
};
const notFound = () => Object.assign(new Error("Playlist not found"), { response: { status: 404, data: { message: "Playlist not found" } } });

// Quy tắc dùng chung với mockMode.js (VITE_USE_MOCK = auto | on | off):
//  - on: luôn lưu cục bộ, không gọi backend
//  - auto: gọi backend; chỉ lưu cục bộ khi backend chưa có endpoint / lỗi server / mất kết nối
//  - off: không bao giờ lưu cục bộ (lỗi sẽ báo ra cho người dùng)
// Lỗi 400/401/403/409... là backend đang trả lời thật nên được ném lại cho UI xử lý.
const withFallback = async (remote, local) => {
    if (MOCK_MODE === "on") return local();
    try {
        return await remote();
    } catch (err) {
        if (!canFallback(err)) throw err;
        return local();
    }
};

// Báo cho Sidebar/Library tải lại danh sách khi playlist thay đổi
const changed = (r) => {
    window.dispatchEvent(new Event("mw:playlists-changed"));
    return r;
};

const summary = (p) => ({ ...p, songCount: (p.songs || []).length });

export const getMyPlaylists = () =>
    withFallback(
        async () => (await api.get("/playlists/me")).data,
        () => readAll().map(summary)
    );

export const getPlaylistById = (playlistId) =>
    withFallback(
        async () => (await api.get(`/playlists/${playlistId}`)).data,
        () => {
            const p = readAll().find((x) => String(x.id) === String(playlistId));
            if (!p) throw notFound();
            return p;
        }
    );

// CreatePlaylistRequest { name, description, isPublic }
export const createPlaylist = ({ name, description = "", isPublic = true }) =>
    withFallback(
        async () => (await api.post("/playlists", { name, description, isPublic })).data,
        () => {
            const list = readAll();
            const playlist = {
                id: `local-${Date.now()}`,
                name,
                description,
                isPublic,
                coverImageUrl: "",
                ownerId: owner(),
                songs: [],
                local: true,
            };
            writeAll([playlist, ...list]);
            return playlist;
        }
    ).then(changed);

// UpdatePlaylistRequest { name, description, isPublic, coverImageUrl }
export const updatePlaylist = (playlistId, payload) =>
    withFallback(
        async () => (await api.put(`/playlists/${playlistId}`, payload)).data,
        () => {
            const list = readAll();
            const i = list.findIndex((x) => String(x.id) === String(playlistId));
            if (i < 0) throw notFound();
            list[i] = { ...list[i], ...payload };
            writeAll(list);
            return list[i];
        }
    ).then(changed);

export const deletePlaylist = (playlistId) =>
    withFallback(
        async () => (await api.delete(`/playlists/${playlistId}`)).data,
        () => {
            writeAll(readAll().filter((x) => String(x.id) !== String(playlistId)));
            return { message: "deleted" };
        }
    ).then(changed);

// song: object bài hát đầy đủ (bản local cần lưu lại thông tin để hiển thị)
export const addSongToPlaylist = (playlistId, song) =>
    withFallback(
        async () => (await api.post(`/playlists/${playlistId}/songs`, { songId: song.id })).data,
        () => {
            const list = readAll();
            const i = list.findIndex((x) => String(x.id) === String(playlistId));
            if (i < 0) throw notFound();
            const songs = list[i].songs || [];
            if (songs.some((s) => String(s.id) === String(song.id))) {
                throw Object.assign(new Error("exists"), { response: { status: 409, data: { message: "Song already in playlist" } } });
            }
            list[i] = { ...list[i], songs: [...songs, song] };
            writeAll(list);
            return list[i];
        }
    ).then(changed);

export const removeSongFromPlaylist = (playlistId, songId) =>
    withFallback(
        async () => (await api.delete(`/playlists/${playlistId}/songs/${songId}`)).data,
        () => {
            const list = readAll();
            const i = list.findIndex((x) => String(x.id) === String(playlistId));
            if (i < 0) throw notFound();
            list[i] = { ...list[i], songs: (list[i].songs || []).filter((s) => String(s.id) !== String(songId)) };
            writeAll(list);
            return list[i];
        }
    ).then(changed);

export default {
    getMyPlaylists,
    getPlaylistById,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
};
