import api from "./api";

/**
 * Khớp AdminController + AdminService (UC15-18). Backend gắn
 * @PreAuthorize("hasRole('ADMIN')") nên chỉ tài khoản ADMIN gọi được.
 *
 *   getAllUsers / lockAccount / unlockAccount
 *   getPendingArtistRequests / approveArtistRequest / rejectArtistRequest
 *   assignRole
 */

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
