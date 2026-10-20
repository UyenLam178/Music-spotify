// Hằng số + hàm tiện ích dùng chung cho trang Quản lý nhạc của nghệ sĩ.
export const MAX_FEAT = 5;
export const MAX_TITLE = 150;
export const MAX_ALBUM = 100;
export const MAX_IMAGE = 2 * 1024 * 1024;
export const MAX_MP3 = 20 * 1024 * 1024;
export const MAX_WAV = 100 * 1024 * 1024;

export const formatDuration = (sec = 0) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

// Backend dùng giờ địa phương không kèm múi giờ ("2026-12-24T20:00:00")
export const toApiDateTime = (v) => (v ? (v.length === 16 ? `${v}:00` : v) : null);
export const toInputDateTime = (v) => (v ? v.slice(0, 16) : "");
export const formatDate = (v) => (v ? new Date(v).toLocaleString() : "");

export const formatBytes = (n = 0) =>
    n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

export const MAX_GENRE_NAME = 50;
