import { readJson, writeJson } from "./storage";

// ============================================================================
// lyricsService.js
//
// Lời bài hát và mốc thời gian được lưu trên trình duyệt theo id bài hát:
//
//     mw_song_lyrics = { [songId]: { lines: [{ time: number|null, text: string }], updatedAt } }
//
// time = giây (có phần thập phân). Bài có ít nhất 1 dòng được gắn mốc => "synced" (lời chạy theo
// nhạc, phát sáng dòng đang hát); các dòng chưa gắn mốc được ước lượng (xem fillMissingTimes)
// để lời vẫn chạy theo nhạc. Không có mốc nào => hiển thị lời tĩnh.
//
// Lưu ý: dữ liệu nằm trong trình duyệt nên chỉ hiện trên máy đã nhập lời.
// ============================================================================

const KEY = "mw_song_lyrics";
export const LYRICS_CHANGED_EVENT = "mw:lyrics-changed";

const readAll = () => readJson(KEY, {});

const cleanLines = (lines) =>
    (Array.isArray(lines) ? lines : [])
        .map((l) => ({
            time: Number.isFinite(l?.time) ? Math.max(0, Number(l.time)) : null,
            text: String(l?.text ?? "").trim(),
        }))
        .filter((l) => l.text !== "");

export const isSynced = (lines) => lines.some((l) => l.time != null);

// Dòng chưa có mốc thời gian được ước lượng từ các dòng đã gắn mốc ở quanh nó:
//   - nằm giữa 2 dòng có mốc  -> chia đều khoảng thời gian giữa chúng
//   - nằm trước dòng có mốc đầu -> chia đều từ giây 0 tới mốc đầu
//   - nằm sau dòng có mốc cuối  -> cách nhau ~3 giây mỗi dòng
// Nhờ vậy artist chỉ gắn thiếu vài dòng thì lời vẫn sáng + tự chuyển dòng, thay vì bị
// coi là lời tĩnh. Muốn chính xác thì vẫn nên gắn mốc đủ mọi dòng.
export const fillMissingTimes = (lines) => {
    const stamped = lines.map((l, i) => (l.time != null ? i : -1)).filter((i) => i >= 0);
    if (!stamped.length) return lines;
    const out = lines.map((l) => ({ ...l }));
    const first = stamped[0];
    const last = stamped[stamped.length - 1];
    for (let i = 0; i < first; i += 1) out[i].time = (lines[first].time * i) / first;
    for (let a = 0; a < stamped.length - 1; a += 1) {
        const i0 = stamped[a];
        const i1 = stamped[a + 1];
        for (let i = i0 + 1; i < i1; i += 1) {
            out[i].time = lines[i0].time + ((lines[i1].time - lines[i0].time) * (i - i0)) / (i1 - i0);
        }
    }
    for (let i = last + 1; i < lines.length; i += 1) out[i].time = lines[last].time + (i - last) * 3;
    return out;
};

export const getLyrics = (songId) => {
    const entry = readAll()[String(songId)];
    if (!entry) return null;
    const clean = cleanLines(entry.lines);
    const lines = fillMissingTimes(clean);
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
    // Báo cho panel "Đang phát" / trang bài hát đang mở nạp lại lời mới ngay
    window.dispatchEvent(new CustomEvent(LYRICS_CHANGED_EVENT, { detail: { songId: String(songId) } }));
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
