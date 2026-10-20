import api from "./api";
import * as userService from "./userService";

// ============================================================================
// Hòm thư (mailbox) của người dùng.
//
// API backend mong đợi (CHƯA có trong backend hiện tại - cần bổ sung):
//   GET    /api/notifications               -> [{ id, type, title, message, read, createdAt }]
//   PUT    /api/notifications/{id}/read
//   PUT    /api/notifications/read-all
//   DELETE /api/notifications/{id}
// type: ARTIST_REQUEST_APPROVED | ARTIST_REQUEST_REJECTED | ...
//
// Khi backend chưa có endpoint (404/lỗi), service tự suy ra thư từ hồ sơ
// (artistRequestStatus) để user vẫn nhận được kết quả duyệt yêu cầu artist.
// Trạng thái đã đọc ở chế độ này lưu ở localStorage.
// ============================================================================

const readKey = (userId) => `mw_inbox_read_${userId}`;
const loadRead = (userId) => {
    try {
        return JSON.parse(localStorage.getItem(readKey(userId)) || "[]");
    } catch {
        return [];
    }
};
const saveRead = (userId, ids) => {
    try {
        localStorage.setItem(readKey(userId), JSON.stringify(ids));
    } catch {
        /* localStorage không dùng được: bỏ qua */
    }
};

const deriveFromProfile = (profile) => {
    if (!profile) return [];
    const readIds = loadRead(profile.id);
    const items = [];
    if (profile.artistRequestStatus === "REJECTED") {
        items.push({ id: "artist-request-rejected", type: "ARTIST_REQUEST_REJECTED" });
    }
    if (profile.role === "ARTIST" && profile.artistRequestStatus === "APPROVED") {
        items.push({ id: "artist-request-approved", type: "ARTIST_REQUEST_APPROVED" });
    }
    return items.map((n) => ({ ...n, read: readIds.includes(n.id), local: true }));
};

export const getNotifications = async (userId) => {
    try {
        const { data } = await api.get("/notifications");
        const list = Array.isArray(data) ? data : data?.content || [];
        return list;
    } catch {
        try {
            return deriveFromProfile(await userService.getProfile());
        } catch {
            return [];
        }
    }
};

export const markRead = async (notification, userId) => {
    if (notification.local) {
        saveRead(userId, [...new Set([...loadRead(userId), notification.id])]);
        return;
    }
    await api.put(`/notifications/${notification.id}/read`);
};

export const markAllRead = async (list, userId) => {
    const local = list.filter((n) => n.local);
    if (local.length) saveRead(userId, [...new Set([...loadRead(userId), ...local.map((n) => n.id)])]);
    if (list.some((n) => !n.local)) await api.put("/notifications/read-all");
};
