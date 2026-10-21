import api from "./api";

// ============================================================================
// videoService.js — video ngắn (Canvas, chạy lặp) gắn với bài hát
//
// Nghệ sĩ gắn cho mỗi bài 1 video ngắn chạy lặp (hiện ở khung "Đang phát" thay ảnh bìa),
// mọi người nghe đều thấy. Quy định: chỉ MP4, dài 7–10 giây, tối đa 50MB.
// Video được kiểm tra ngay khi chọn để báo lỗi sớm.
// ============================================================================

export const VIDEO_MAX_BYTES = 50 * 1024 * 1024; // 50 MB
export const VIDEO_MIN_SECONDS = 7;
export const VIDEO_MAX_SECONDS = 10;
const DURATION_TOLERANCE = 0.25; // video "10s" thường đo ra 10.02s

// Đọc độ dài video bằng thẻ <video> ẩn. Reject nếu trình duyệt không giải mã được.
export const readVideoDuration = (file) =>
    new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const video = document.createElement("video");
        let settled = false;
        let timer = null;
        const done = (fn, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            URL.revokeObjectURL(url);
            video.removeAttribute("src");
            video.load();
            fn(value);
        };
        timer = setTimeout(() => done(reject, new Error("unreadable")), 8000);
        video.preload = "metadata";
        video.onloadedmetadata = () => {
            if (Number.isFinite(video.duration)) {
                done(resolve, video.duration);
                return;
            }
            // Một số file (webm ghi bằng MediaRecorder...) báo độ dài = Infinity:
            // tua tới cuối để trình duyệt tính ra độ dài thật.
            video.ontimeupdate = () => {
                if (Number.isFinite(video.duration)) done(resolve, video.duration);
            };
            video.currentTime = 1e7;
        };
        video.onerror = () => done(reject, new Error("unreadable"));
        video.src = url;
    });

// Kiểm tra file người dùng chọn. Ném Error có .code = "type" | "size" | "unreadable" | "duration".
// Thành công: trả về { duration }.
export const validateVideoFile = async (file) => {
    const fail = (code) => Object.assign(new Error(code), { code });
    if (!file || file.type !== "video/mp4") throw fail("type");
    if (file.size > VIDEO_MAX_BYTES) throw fail("size");
    let duration;
    try {
        duration = await readVideoDuration(file);
    } catch {
        throw fail("unreadable");
    }
    if (
        !Number.isFinite(duration) ||
        duration < VIDEO_MIN_SECONDS - DURATION_TOLERANCE ||
        duration > VIDEO_MAX_SECONDS + DURATION_TOLERANCE
    ) {
        throw Object.assign(fail("duration"), { duration });
    }
    return { duration };
};

// Đăng hoặc thay video của bài.
export const saveVideo = async (songId, file) => {
    const form = new FormData();
    form.append("canvas", file);
    const { data } = await api.put(`/artist/songs/${songId}/canvas`, form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 0, // file tới 50MB, mạng chậm có thể mất lâu hơn mặc định
    });
    return data;
};

// Gỡ video của bài (canvasUrl về null -> panel quay lại hiện ảnh bìa).
export const deleteVideo = async (songId) => {
    const { data } = await api.delete(`/artist/songs/${songId}/canvas`);
    return data;
};
