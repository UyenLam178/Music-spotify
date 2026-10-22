import api from "./api";

// ============================================================================
// lyricsService.js
//
// Lời bài hát được lưu trên backend (không còn lưu trong localStorage):
//   GET    /songs/{id}/lyrics          người nghe xem lời (bài đã phát hành)
//   GET    /artist/songs/{id}/lyrics   artist xem lời bài của mình để sửa
//   PUT    /artist/songs/{id}/lyrics   artist lưu lời  { content: "<văn bản LRC>" }
//   DELETE /artist/songs/{id}/lyrics   artist xoá lời
//
// Backend trả { synced, content, lines: [{ timeMs, text }] }. Ở giao diện mỗi dòng là
// { time: giây|null, text }. Backend yêu cầu "mọi dòng đều có mốc" hoặc "không dòng nào có",
// nên khi lưu các dòng thiếu mốc được ước lượng (fillMissingTimes) trước khi gửi.
// ============================================================================

export const LYRICS_CHANGED_EVENT = "mw:lyrics-changed";

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

// Phản hồi backend -> { lines: [{ time, text }], synced, content, updatedAt } hoặc null nếu chưa có lời
const fromResponse = (data) => {
    const lines = (data?.lines || []).map((l) => ({
        time: l?.timeMs != null ? Number(l.timeMs) / 1000 : null,
        text: String(l?.text ?? ""),
    }));
    if (!lines.length) return null;
    return { lines, synced: lines.some((l) => l.time != null), content: data.content || "", updatedAt: data.updatedAt };
};

// Người nghe: lời của bài đã phát hành. Lỗi (bài không tồn tại, mất mạng...) => coi như chưa có lời.
export const getLyrics = async (songId) => {
    try {
        const { data } = await api.get(`/songs/${songId}/lyrics`);
        return fromResponse(data);
    } catch {
        return null;
    }
};

// Artist: lời bài của mình (cả bài chưa phát hành) để mở trong hộp thoại sửa. Lỗi được ném ra.
export const getMyLyrics = async (songId) => {
    const { data } = await api.get(`/artist/songs/${songId}/lyrics`);
    return fromResponse(data);
};

const notifyChanged = (songId) =>
    // Báo cho panel "Đang phát" / trang bài hát đang mở nạp lại lời mới ngay
    window.dispatchEvent(new CustomEvent(LYRICS_CHANGED_EVENT, { detail: { songId: String(songId) } }));

// Lưu (thay toàn bộ) lời. Không còn dòng nào => xoá lời. Lỗi từ backend được ném ra cho giao diện hiển thị.
export const saveLyrics = async (songId, lines) => {
    const cleaned = cleanLines(lines);
    if (!cleaned.length) {
        await deleteLyrics(songId);
        return [];
    }
    await api.put(`/artist/songs/${songId}/lyrics`, { content: toLrc(fillMissingTimes(cleaned)) });
    notifyChanged(songId);
    return cleaned;
};

export const deleteLyrics = async (songId) => {
    try {
        await api.delete(`/artist/songs/${songId}/lyrics`);
    } catch (err) {
        // "Song has no lyrics" (400) => đã không còn lời, coi như xoá xong
        if (err?.response?.status !== 400) throw err;
    }
    notifyChanged(songId);
};

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
    const cs = Math.max(0, Math.round(sec * 100)); // làm tròn theo 1/100 giây để không ra "00:60.00"
    const m = Math.floor(cs / 6000);
    const s = Math.floor((cs % 6000) / 100);
    const f = cs % 100;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(f).padStart(2, "0")}`;
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
