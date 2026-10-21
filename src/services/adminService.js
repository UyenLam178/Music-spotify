import api from "./api";

// Danh sách có thể là mảng thuần hoặc có dạng phân trang { content: [...] }
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

// ---------------------------------------------------------------------------
// Kiểm duyệt bài hát (chỉ ADMIN)
// ---------------------------------------------------------------------------

// UC34 — status: PENDING | APPROVED | REJECTED | HIDDEN | DELETED (viết HOA); bỏ trống = mọi bài trừ DELETED
// Kết quả phân trang { content, page, size, totalElements, totalPages }
export const getSongs = async ({ status, page = 0, size = 20 } = {}) =>
    (await api.get("/admin/songs", { params: { ...(status ? { status } : {}), page, size } })).data;

// UC35 — duyệt bài đang PENDING
export const approveSong = async (songId) => (await api.put(`/admin/songs/${songId}/approve`)).data;

// UC35 — từ chối bài đang PENDING (bắt buộc lý do, tối đa 255 ký tự)
export const rejectSong = async (songId, reason) =>
    (await api.put(`/admin/songs/${songId}/reject`, { reason })).data;

// UC36 — gỡ bài đã duyệt (APPROVED / HIDDEN) kèm lý do
export const removeSong = async (songId, reason) =>
    (await api.put(`/admin/songs/${songId}/remove`, { reason })).data;
