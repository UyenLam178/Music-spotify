import api, { resolveAssetUrl } from "./api";
import * as genreService from "./genreService";
import { getMeta } from "./songMetaService";
import { placeholderCover } from "../utils/cover";
import { Role } from "../utils/enums";

// ============================================================================
// songService.js — API NGƯỜI NGHE (docs/song.md, UC20 – UC25 + lịch sử nghe)
//
// Chỉ dùng dữ liệu THẬT từ backend, KHÔNG còn mock / dữ liệu mẫu.
//
//   GET  /songs?page&size                  danh sách bài đã phát hành   (UC20)
//   GET  /songs/search?keyword&page&size   tìm kiếm                     (UC21)
//   GET  /songs/{id}                       chi tiết bài                 (UC22)
//   POST /songs/{id}/play                  ghi nhận lượt nghe           (UC24)
//   GET  /songs/artists/{id}?page&size     trang nghệ sĩ                (UC25)
//   GET  /users/me/history                 nghe gần đây (tối đa 10)
//
// QUYỀN: mọi API trên đều yêu cầu ĐĂNG NHẬP (USER / ARTIST / ADMIN đều dùng được),
// chưa đăng nhập -> 401. Backend chưa có API album / trending / popular artists /
// thể loại, nên trang chủ được dựng từ danh sách bài đã phát hành.
// ============================================================================

const PAGE_SIZE = 50; // backend ép size về 1–50
const MAX_PAGES = 6; // chặn vòng lặp tải quá nhiều trang

// ----------------------------------------------------------------------------
// Chuyển SongResponse của backend -> shape UI dùng
// SongResponse: { id, title, audioUrl, coverUrl, durationSeconds, playCount, releaseAt,
//                 artistId, artistName, featuredArtists: [{ id, artistName }] }
// ----------------------------------------------------------------------------
export const toListenerSong = (s) => {
    if (!s) return null;
    const feat = (s.featuredArtists || []).filter((a) => a?.artistName);
    const meta = getMeta(s.id);
    return {
        id: s.id,
        title: s.title,
        artistId: s.artistId,
        mainArtistName: s.artistName,
        artistName: [s.artistName, ...feat.map((a) => a.artistName)].filter(Boolean).join(", "),
        featuredArtists: feat,
        albumTitle: meta?.albumTitle || "",
        coverUrl: s.coverUrl ? resolveAssetUrl(s.coverUrl) : placeholderCover(s.title),
        duration: s.durationSeconds ?? 0,
        audioUrl: resolveAssetUrl(s.audioUrl),
        playCount: s.playCount ?? 0,
        releaseAt: s.releaseAt,
        // Ưu tiên thể loại do backend trả (nếu sau này có), nếu không lấy từ metadata cục bộ.
        // Luôn là 1 giá trị đơn: 1 bài chỉ thuộc 1 thể loại.
        genreId: s.genreId != null ? String(s.genreId) : s.genre?.id != null ? String(s.genre.id) : meta?.genreId ?? null,
    };
};

const normalizeText = (str = "") =>
    str.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
const matchesQuery = (text, query) => normalizeText(text).includes(normalizeText(query));

const toArtist = (id, name, avatarUrl) => ({
    id,
    name,
    avatarUrl: avatarUrl ? resolveAssetUrl(avatarUrl) : placeholderCover(name),
});

// Tải lần lượt các trang của 1 API trả PageResponse, gộp content lại.
const fetchAllPages = async (path, params = {}, maxPages = MAX_PAGES) => {
    const all = [];
    for (let page = 0; page < maxPages; page += 1) {
        const { data } = await api.get(path, { params: { ...params, page, size: PAGE_SIZE } });
        all.push(...(data?.content || []));
        if (page >= (data?.totalPages ?? 1) - 1) break;
    }
    return all;
};

// Khi lỗi 400 "... does not exist" của backend => coi như không có
const isNotFound = (err) => err?.response?.status === 400;

// ----------------------------------------------------------------------------
// Bài hát
// ----------------------------------------------------------------------------
export const getAllSongs = async () => (await fetchAllPages("/songs")).map(toListenerSong);

export const getSongById = async (id) => {
    try {
        const { data } = await api.get(`/songs/${id}`);
        return toListenerSong(data);
    } catch (err) {
        if (isNotFound(err)) return null;
        throw err;
    }
};

// UC24 — gọi 1 lần khi BẮT ĐẦU phát. Lỗi không được làm dừng nhạc => nuốt lỗi.
export const recordPlay = (songId) => api.post(`/songs/${songId}/play`).catch(() => {});

// Lịch sử nghe gần đây: [{ song, playedAt }]
export const getRecentHistory = async () => {
    const { data } = await api.get("/users/me/history");
    return (Array.isArray(data) ? data : [])
        .filter((h) => h?.song)
        .map((h) => ({ ...toListenerSong(h.song), playedAt: h.playedAt }));
};

// ----------------------------------------------------------------------------
// Nghệ sĩ
// ----------------------------------------------------------------------------
const avatarCache = new Map(); // artistId -> url (chỉ trong phiên hiện tại)

// Trang nghệ sĩ: ArtistSongsResponse { artistId, artistName, bio, avatarUrl, songs: PageResponse }
// Gồm bài nghệ sĩ là Artist chính HOẶC được feat. Nghệ sĩ mới chưa có bài vẫn trả về bình thường.
export const getArtistById = async (id) => {
    try {
        let page = 0;
        let info = null;
        const songs = [];
        // tải hết các trang bài hát (tối đa MAX_PAGES)
        while (true) {
            const { data } = await api.get(`/songs/artists/${id}`, { params: { page, size: PAGE_SIZE } });
            info = info || data;
            songs.push(...(data?.songs?.content || []));
            page += 1;
            if (page >= (data?.songs?.totalPages ?? 1) || page >= MAX_PAGES) break;
        }
        const artist = toArtist(info.artistId, info.artistName, info.avatarUrl);
        avatarCache.set(String(artist.id), artist.avatarUrl);
        return {
            ...artist,
            bio: info.bio || "",
            topSongs: songs.map(toListenerSong).sort((a, b) => b.playCount - a.playCount),
        };
    } catch (err) {
        if (isNotFound(err)) return null; // "Artist does not exist"
        throw err;
    }
};

// Bổ sung ảnh đại diện thật cho danh sách nghệ sĩ (mỗi nghệ sĩ 1 lần gọi trang nghệ sĩ nhỏ)
const withAvatars = async (artists) =>
    Promise.all(
        artists.map(async (a) => {
            const cached = avatarCache.get(String(a.id));
            if (cached) return { ...a, avatarUrl: cached };
            try {
                const { data } = await api.get(`/songs/artists/${a.id}`, { params: { page: 0, size: 1 } });
                const url = data?.avatarUrl ? resolveAssetUrl(data.avatarUrl) : a.avatarUrl;
                avatarCache.set(String(a.id), url);
                return { ...a, avatarUrl: url };
            } catch {
                return a;
            }
        })
    );

// Nghệ sĩ (chính + feat) rút ra từ danh sách bài; mặc định xếp theo tổng lượt nghe
const artistsFromSongs = (songs, nameFilter = null) => {
    const map = new Map();
    const add = (id, name, plays) => {
        if (id == null || !name) return;
        if (nameFilter && !matchesQuery(name, nameFilter)) return;
        const cur = map.get(String(id)) || { ...toArtist(id, name), plays: 0 };
        cur.plays += plays;
        map.set(String(id), cur);
    };
    songs.forEach((s) => {
        add(s.artistId, s.mainArtistName, s.playCount);
        s.featuredArtists.forEach((a) => add(a.id, a.artistName, s.playCount));
    });
    return [...map.values()].sort((a, b) => b.plays - a.plays);
};

// ----------------------------------------------------------------------------
// Trang chủ — dựng từ các bài đã phát hành (backend chưa có API trending / album)
// ----------------------------------------------------------------------------
export const getHomeData = async () => {
    const songs = await getAllSongs(); // đã sắp xếp: mới phát hành lên đầu
    const trending = [...songs].filter((s) => s.playCount > 0).sort((a, b) => b.playCount - a.playCount).slice(0, 12);
    const artists = await withAvatars(artistsFromSongs(songs).slice(0, 12));
    return { newest: songs.slice(0, 12), trending, artists };
};

// ----------------------------------------------------------------------------
// Thể loại — 1 bài CHỈ thuộc đúng 1 thể loại (so khớp chặt theo genreId của bài)
// ----------------------------------------------------------------------------
export const getGenres = () => genreService.getGenres();

export const getSongsByGenre = async (genreId) => {
    const songs = await getAllSongs();
    return songs.filter((s) => s.genreId != null && String(s.genreId) === String(genreId));
};

// ----------------------------------------------------------------------------
// Tìm kiếm — GET /songs/search tìm theo tên bài, nghệ danh chính và nghệ danh feat.
// Backend chưa có API tìm nghệ sĩ cho người nghe, nên:
//   * nghệ sĩ khớp tên được rút ra từ các bài tìm thấy;
//   * ARTIST  : thêm GET /artist/search-artists (cả nghệ sĩ chưa có bài);
//   * ADMIN   : thêm GET /admin/users (lọc ARTIST đang ACTIVE).
// Lỗi của API bài hát được ném ra để trang Search hiển thị (401 = chưa đăng nhập, 429...).
// ----------------------------------------------------------------------------
const searchExtraArtists = async (q, role) => {
    try {
        if (role === Role.ARTIST) {
            const { data } = await api.get("/artist/search-artists", { params: { keyword: q } });
            return (Array.isArray(data) ? data : []).map((a) => toArtist(a.id, a.artistName));
        }
        if (role === Role.ADMIN) {
            const { data } = await api.get("/admin/users");
            const users = Array.isArray(data) ? data : data?.content || [];
            return users
                .filter((u) => u.role === "ARTIST" && u.accountStatus === "ACTIVE" && matchesQuery(u.artistName, q))
                .map((u) => toArtist(u.id, u.artistName, u.avatarUrl));
        }
    } catch {
        /* nguồn phụ: lỗi thì bỏ qua */
    }
    return [];
};

export const search = async (query, { role } = {}) => {
    const q = (query || "").trim();
    if (!q) return { songs: [], artists: [] };

    const [rawSongs, extra] = await Promise.all([
        fetchAllPages("/songs/search", { keyword: q }, 3),
        searchExtraArtists(q, role),
    ]);
    const songs = rawSongs.map(toListenerSong);

    const seen = new Set();
    const merged = [...artistsFromSongs(songs, q), ...extra].filter(
        (a) => !seen.has(String(a.id)) && seen.add(String(a.id))
    );
    return { songs, artists: await withAvatars(merged.slice(0, 12)) };
};

export default {
    getAllSongs,
    getSongById,
    getArtistById,
    getHomeData,
    getRecentHistory,
    getGenres,
    getSongsByGenre,
    recordPlay,
    search,
};
