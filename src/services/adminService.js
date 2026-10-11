import api from "./api";

// Backend có thể trả mảng thuần (List<User>) hoặc Page { content: [...] }
const toList = (data) => (Array.isArray(data) ? data : data?.content || []);

export const getAllUsers = async () => toList((await api.get("/admin/users")).data);

export const lockAccount = async (userId) => (await api.put(`/admin/users/${userId}/lock`)).data;

export const unlockAccount = async (userId) => (await api.put(`/admin/users/${userId}/unlock`)).data;

export const getPendingArtistRequests = async () =>
    toList((await api.get("/admin/artist-requests")).data);

export const approveArtistRequest = async (userId) =>
    (await api.put(`/admin/artist-requests/${userId}/approve`)).data;

export const rejectArtistRequest = async (userId) =>
    (await api.put(`/admin/artist-requests/${userId}/reject`)).data;

// role ∈ USER | ARTIST | ADMIN
export const assignRole = async (userId, role) =>
    (await api.put(`/admin/users/${userId}/role`, { role })).data;

// Duyệt bài hát (UC34-UC36). Backend CHƯA có các endpoint này (chỉ có DTO RejectSongRequest):
//   GET /admin/songs?status=PENDING      -> [SongManageResponse]
//   PUT /admin/songs/{id}/approve
//   PUT /admin/songs/{id}/reject  { reason }
export const getPendingSongs = async () =>
    toList((await api.get("/admin/songs", { params: { status: "PENDING" } })).data);

export const approveSong = async (songId) => (await api.put(`/admin/songs/${songId}/approve`)).data;

export const rejectSong = async (songId, reason) =>
    (await api.put(`/admin/songs/${songId}/reject`, { reason })).data;
