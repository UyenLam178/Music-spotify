import { readJson, writeJson } from "./storage";

// ============================================================================
// songMetaService.js
//
// Thể loại và album của bài hát được lưu trên trình duyệt theo id bài hát:
//     { [songId]: { genreId, albumTitle, artistId } }
//
// (không bao giờ là mảng). Mọi dữ liệu cũ lỡ lưu dạng mảng sẽ bị ép về phần tử đầu.
//
// Lưu ý: dữ liệu nằm trong trình duyệt nên chỉ đúng trên máy nghệ sĩ đã đăng bài.
// ============================================================================

const KEY = "mw_song_meta";

// Ép genreId về 1 giá trị đơn: mảng -> phần tử đầu; rỗng -> null
export const toSingleGenreId = (value) => {
    const v = Array.isArray(value) ? value[0] : value;
    return v === undefined || v === null || v === "" ? null : String(v);
};

const readAll = () => readJson(KEY, {});

export const getMeta = (songId) => {
    const m = readAll()[String(songId)];
    return m ? { ...m, genreId: toSingleGenreId(m.genreId) } : null;
};

export const setMeta = (songId, patch) => {
    const all = readAll();
    const id = String(songId);
    const next = { ...(all[id] || {}), ...patch };
    delete next.song; // bản sao bài hát cũ không còn dùng: dữ liệu thật lấy từ API
    next.genreId = toSingleGenreId(next.genreId);
    all[id] = next;
    writeJson(KEY, all);
    return next;
};

// Gọi mỗi lần tải "Bài hát của tôi": dọn metadata của các bài đã bị xóa
export const syncArtistSongs = (artistId, songs) => {
    const all = readAll();
    const present = new Set(songs.map((s) => String(s.id)));
    let changed = false;
    Object.keys(all).forEach((id) => {
        if (String(all[id].artistId) === String(artistId) && !present.has(id)) {
            delete all[id];
            changed = true;
        }
    });
    if (changed) writeJson(KEY, all);
};

// Các album nghệ sĩ đã đặt trước đó (để chọn nhanh ở bước 3)
export const getMyAlbums = (artistId) => {
    const titles = Object.values(readAll())
        .filter((m) => String(m.artistId) === String(artistId) && m.albumTitle)
        .map((m) => m.albumTitle);
    return [...new Set(titles)].sort((a, b) => a.localeCompare(b));
};
