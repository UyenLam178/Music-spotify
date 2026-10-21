import api from "./api";
import * as userService from "./userService";

// ============================================================================
// Hòm thư (mailbox) của người dùng.
//
// Thư gồm kết quả duyệt yêu cầu trở thành nghệ sĩ (được duyệt / bị từ chối).
// Thư được suy ra từ hồ sơ người dùng; trạng thái đã đọc lưu trên trình duyệt.
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
