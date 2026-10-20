import { readJson, writeJson } from "./storage";

// ============================================================================
// lyricsService.js
//
// Backend (entity Song) CHƯA có trường lời bài hát, và theo yêu cầu thì chỉ chỉnh
// FRONTEND, nên lời + mốc thời gian được lưu trong localStorage theo id bài hát
// (cùng cách songMetaService đang lưu thể loại / album):
//
//     mw_song_lyrics = { [songId]: { lines: [{ time: number|null, text: string }], updatedAt } }
//
// time = giây (có phần thập phân). Bài có đủ mốc thời gian cho MỌI dòng => "synced"
// (chạy theo nhạc, phát sáng dòng hiện tại). Thiếu mốc => hiển thị lời tĩnh.
//
// Lưu ý: dữ liệu nằm trong trình duyệt nên chỉ hiện trên máy đã nhập lời. Muốn mọi
// người nghe đều thấy, backend cần thêm cột `lyrics` (nên lưu chuỗi LRC, hàm
// toLrc / parseLrc bên dưới dùng được luôn) — khi đó chỉ cần đổi getLyrics/saveLyrics.
// ============================================================================

const KEY = "mw_song_lyrics";

const readAll = () => readJson(KEY, {});

const cleanLines = (lines) =>
    (Array.isArray(lines) ? lines : [])
        .map((l) => ({
            time: Number.isFinite(l?.time) ? Math.max(0, Number(l.time)) : null,
            text: String(l?.text ?? "").trim(),
        }))
        .filter((l) => l.text !== "");

export const isSynced = (lines) => lines.length > 0 && lines.every((l) => l.time != null);

export const getLyrics = (songId) => {
    const entry = readAll()[String(songId)];
    if (!entry) return null;
    const lines = cleanLines(entry.lines);
    return lines.length ? { lines, synced: isSynced(lines), updatedAt: entry.updatedAt } : null;
};

export const saveLyrics = (songId, lines) => {
    const all = readAll();
    const cleaned = cleanLines(lines);
    if (!cleaned.length) {
        delete all[String(songId)];
    } else {
        all[String(songId)] = { lines: cleaned, updatedAt: new Date().toISOString() };
    }
    writeJson(KEY, all);
    return cleaned;
};

export const deleteLyrics = (songId) => saveLyrics(songId, []);

// ---------------------------------------------------------------------------
// LRC: "[mm:ss.xx] lời" — định dạng lời có mốc thời gian phổ biến nhất
// ---------------------------------------------------------------------------
const TAG = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

// Văn bản (thuần hoặc LRC) -> [{ time|null, text }]
export const parseLyricsText = (raw = "") => {
    const out = [];
    String(raw)
        .replace(/\r/g, "")
        .split("\n")
        .forEach((row) => {
            const stamps = [...row.matchAll(TAG)];
            const text = row.replace(TAG, "").trim();
            if (stamps.length) {
                // Tag metadata như [ar:xxx] không khớp TAG nên được xử lý ở nhánh else
                stamps.forEach((m) => {
                    const frac = m[3] ? Number(`0.${m[3]}`) : 0;
                    out.push({ time: Number(m[1]) * 60 + Number(m[2]) + frac, text });
                });
            } else if (!/^\[[a-z]+:.*\]$/i.test(row.trim())) {
                out.push({ time: null, text: row.trim() });
            }
        });
    // Dòng có nhiều tag thời gian (điệp khúc lặp) -> sắp theo thời gian nếu mọi dòng đều có mốc
    const stamped = out.filter((l) => l.time != null);
    const lines = stamped.length === out.filter((l) => l.text !== "").length ? stamped.sort((a, b) => a.time - b.time) : out;
    return lines.filter((l) => l.text !== "");
};

export const formatLrcTime = (sec) => {
    const s = Math.max(0, sec);
    const m = Math.floor(s / 60);
    const rest = (s - m * 60).toFixed(2).padStart(5, "0");
    return `${String(m).padStart(2, "0")}:${rest}`;
};

export const toLrc = (lines) =>
    lines.map((l) => (l.time != null ? `[${formatLrcTime(l.time)}] ${l.text}` : l.text)).join("\n");

// Dòng đang hát tại thời điểm `time` (giây); -1 nếu chưa tới dòng đầu tiên
export const activeLineIndex = (lines, time) => {
    let lo = 0;
    let hi = lines.length - 1;
    let ans = -1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (lines[mid].time <= time) {
            ans = mid;
            lo = mid + 1;
        } else hi = mid - 1;
    }
    return ans;
};
