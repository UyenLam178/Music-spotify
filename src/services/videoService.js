// ============================================================================
// videoService.js — video ngắn (loop) gắn với bài hát
//
// Backend (entity Song) CHƯA có trường video và KHÔNG sửa backend, nên video được
// lưu trong IndexedDB của trình duyệt theo id bài hát (cùng cách lyricsService /
// songMetaService đang lưu lời + thể loại). localStorage chỉ ~5MB nên KHÔNG dùng
// được cho file tới 50MB; IndexedDB lưu được Blob lớn.
//
// Lưu ý: dữ liệu nằm trong trình duyệt nên chỉ hiện trên máy đã tải video lên.
// Muốn mọi người nghe đều thấy, backend cần thêm endpoint upload video + cột
// videoUrl — khi đó chỉ cần đổi 3 hàm getVideo / saveVideo / deleteVideo ở file này.
// ============================================================================

export const VIDEO_MAX_BYTES = 50 * 1024 * 1024; // 50 MB
export const VIDEO_MIN_SECONDS = 7;
export const VIDEO_MAX_SECONDS = 10;
const DURATION_TOLERANCE = 0.25; // video "10s" thường đo ra 10.02s

const DB_NAME = "mw_media";
const STORE = "song_videos";

const openDb = () =>
    new Promise((resolve, reject) => {
        if (typeof indexedDB === "undefined") {
            reject(new Error("IndexedDB_UNAVAILABLE"));
            return;
        }
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains(STORE)) {
                req.result.createObjectStore(STORE, { keyPath: "songId" });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });

const run = async (mode, fn) => {
    const db = await openDb();
    try {
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, mode);
            const req = fn(tx.objectStore(STORE));
            tx.oncomplete = () => resolve(req?.result);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    } finally {
        db.close();
    }
};

// Trả về { blob, name, size, duration, updatedAt } hoặc null
export const getVideo = async (songId) => {
    try {
        return (await run("readonly", (s) => s.get(String(songId)))) || null;
    } catch {
        return null;
    }
};

export const hasVideo = async (songId) => !!(await getVideo(songId));

export const saveVideo = (songId, file, duration) =>
    run("readwrite", (s) =>
        s.put({
            songId: String(songId),
            blob: file,
            name: file.name,
            size: file.size,
            duration,
            updatedAt: new Date().toISOString(),
        })
    );

export const deleteVideo = (songId) => run("readwrite", (s) => s.delete(String(songId)));

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

// Cắt đoạn [start, start + length] giây của video thành File .webm mới.
// Trình duyệt không cắt file trực tiếp được nên video được phát (tắt tiếng) và ghi lại
// bằng MediaRecorder => cắt 10s mất ~10s, chất lượng giảm nhẹ.
// onProgress(0..1) gọi liên tục trong lúc cắt. Lỗi: Error.code = "trimUnsupported" | "unreadable".
export const trimVideo = (file, start, length, onProgress) =>
    new Promise((resolve, reject) => {
        const fail = (code) => Object.assign(new Error(code), { code });
        const capture = (v) => (v.captureStream ? v.captureStream() : v.mozCaptureStream?.());
        const video = document.createElement("video");
        if (!capture(video) || typeof MediaRecorder === "undefined") {
            reject(fail("trimUnsupported"));
            return;
        }

        const url = URL.createObjectURL(file);
        let recorder = null;
        let ticker = null;
        let finished = false;
        const chunks = [];

        const cleanup = () => {
            clearInterval(ticker);
            video.pause();
            URL.revokeObjectURL(url);
            video.removeAttribute("src");
            video.load();
        };
        const abort = (code) => {
            if (finished) return;
            finished = true;
            if (recorder && recorder.state !== "inactive") {
                recorder.onstop = null;
                recorder.stop();
            }
            cleanup();
            reject(fail(code));
        };

        const begin = async () => {
            const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) =>
                MediaRecorder.isTypeSupported(m)
            );
            try {
                recorder = new MediaRecorder(capture(video), {
                    ...(mimeType ? { mimeType } : {}),
                    videoBitsPerSecond: 2_500_000,
                });
            } catch {
                abort("trimUnsupported");
                return;
            }
            recorder.ondataavailable = (e) => e.data?.size && chunks.push(e.data);
            recorder.onstop = () => {
                if (finished) return;
                finished = true;
                cleanup();
                const base = file.name.replace(/\.\w+$/, "");
                resolve(new File(chunks, `${base}-trim.webm`, { type: "video/webm" }));
            };
            recorder.start(250);
            try {
                await video.play();
            } catch {
                abort("unreadable");
                return;
            }
            ticker = setInterval(() => {
                const elapsed = video.currentTime - start;
                onProgress?.(Math.max(0, Math.min(elapsed / length, 1)));
                if (elapsed >= length || video.ended) {
                    clearInterval(ticker);
                    if (recorder.state !== "inactive") recorder.stop();
                }
            }, 100);
        };

        video.muted = true;
        video.playsInline = true;
        video.preload = "auto";
        video.onerror = () => abort("unreadable");
        video.onloadedmetadata = () => {
            if (start > 0.05) {
                video.onseeked = () => {
                    video.onseeked = null;
                    begin();
                };
                video.currentTime = start;
            } else {
                begin();
            }
        };
        video.src = url;
    });

// Kiểm tra file người dùng chọn. Ném Error có .code = "type" | "size" | "unreadable" | "duration".
// Thành công: trả về { duration }.
export const validateVideoFile = async (file) => {
    const fail = (code) => Object.assign(new Error(code), { code });
    if (!file || !String(file.type).startsWith("video/")) throw fail("type");
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
