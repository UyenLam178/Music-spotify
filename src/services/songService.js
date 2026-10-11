import api, { resolveAssetUrl, tokenStorage } from "./api";
import * as genreService from "./genreService";
import { MOCK_MODE, withMock } from "./mockMode";
import * as artistService from "./artistService";
import * as adminService from "./adminService";
import * as userService from "./userService";
import { mockSongs, mockAlbums, mockArtists } from "./mockData";

// ============================================================================
// songService.js
//
// Luôn gọi API thật của backend trước. Việc có dùng dữ liệu mẫu (mock) hay
// không do mockMode.js quyết định (VITE_USE_MOCK = auto | on | off, xem .env):
// ở chế độ auto, endpoint nào backend đã có thì tự dùng dữ liệu thật, mock chỉ
// chạy khi endpoint đó chưa có / backend lỗi. Không trộn mock với dữ liệu thật.
// ============================================================================

// Đường dẫn ảnh/nhạc backend trả về có thể là tương đối ("/uploads/a.mp3") -> đổi thành URL dùng được.
const asset = (url) => (url ? resolveAssetUrl(url) : url);

// Chuẩn hoá 1 bài hát từ backend (SongResponse / SongManageResponse:
// durationSeconds, playCount, likeCount?, artistName, featuredArtists...) để UI
// luôn nhận đúng shape: duration, coverUrl, audioUrl, playCount, likeCount.
export const normalizeSong = (song) => {
    if (!song) return song;
    return {
        ...song,
        id: song.id,
        title: song.title,
        artistId: song.artistId ?? song.artist?.id,
        artistName: song.artistName ?? song.artist?.artistName ?? song.artist?.name,
        albumId: song.albumId ?? song.album?.id,
        albumTitle: song.albumTitle ?? song.album?.title,
        coverUrl: asset(song.coverUrl ?? song.imageUrl ?? song.album?.coverUrl),
        duration: song.duration ?? song.durationSeconds ?? song.durationInSeconds ?? 0,
        audioUrl: asset(song.audioUrl ?? song.fileUrl ?? song.url),
        genreId: song.genreId ?? song.genre?.id,
        playCount: song.playCount ?? 0,
        likeCount: song.likeCount ?? song.likes,
    };
};

const normalizeAlbum = (album) => {
    if (!album) return album;
    return {
        ...album,
        id: album.id,
        title: album.title,
        artistId: album.artistId ?? album.artist?.id,
        artistName: album.artistName ?? album.artist?.artistName ?? album.artist?.name,
        coverUrl: asset(album.coverUrl ?? album.imageUrl),
        songs: Array.isArray(album.songs) ? album.songs.map(normalizeSong) : album.songs,
    };
};

// Nghệ sĩ: backend (ArtistSummary / ArtistSongsResponse) dùng "artistName" + "avatarUrl"
const normalizeArtist = (artist) => {
    if (!artist) return artist;
    return {
        ...artist,
        id: artist.id ?? artist.artistId,
        name: artist.name ?? artist.artistName,
        avatarUrl: asset(artist.avatarUrl ?? artist.imageUrl),
        followers: artist.followers ?? artist.followerCount,
        // Backend (ArtistSongsResponse) trả bài trong songs.content; dữ liệu mẫu dùng topSongs
        topSongs: Array.isArray(artist.topSongs)
            ? artist.topSongs.map(normalizeSong)
            : Array.isArray(artist.songs?.content)
              ? artist.songs.content.map(normalizeSong)
              : artist.topSongs,
        albums: Array.isArray(artist.albums) ? artist.albums.map(normalizeAlbum) : artist.albums,
    };
};

// Tìm kiếm không phân biệt hoa/thường và dấu tiếng Việt, dùng cho search mock.
const normalizeText = (str = "") =>
    str.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const matchesQuery = (text, query) => normalizeText(text).includes(normalizeText(query));

const toList = (data) => (Array.isArray(data) ? data : data?.content);

// Lấy danh sách: backend thật -> (nếu cho phép) mock; lỗi khác => []
const fetchList = async (url, normalize, mockList, params) => {
    try {
        const { data } = await withMock(
            () => api.get(url, params ? { params } : undefined),
            () => ({ data: mockList() }),
            url,
            (d) => Array.isArray(toList(d))
        );
        const list = toList(data);
        return Array.isArray(list) ? list.map(normalize) : [];
    } catch (error) {
        console.error(`Không tải được ${url}:`, error?.response?.status ?? error.message);
        return [];
    }
};

// Lấy 1 đối tượng: backend thật -> (nếu cho phép) mock; không có => null
const fetchOne = async (url, normalize, mockOne) => {
    try {
        const { data } = await withMock(
            () => api.get(url),
            () => ({ data: mockOne() }),
            url,
            (d) => d === null || (typeof d === "object" && !Array.isArray(d))
        );
        return data ? normalize(data) : null;
    } catch (error) {
        console.error(`Không tải được ${url}:`, error?.response?.status ?? error.message);
        return null;
    }
};

// ----------------------------------------------------------------------------
// Trang chủ
// ----------------------------------------------------------------------------
export const getTrendingSongs = () => fetchList("/songs/trending", normalizeSong, () => mockSongs);

export const getNewReleases = () => fetchList("/albums/new-releases", normalizeAlbum, () => mockAlbums);

export const getPopularArtists = () => fetchList("/artists/popular", normalizeArtist, () => mockArtists);

// ----------------------------------------------------------------------------
// Chi tiết bài hát / album / nghệ sĩ (null nếu không có)
// ----------------------------------------------------------------------------
export const getSongById = (id) =>
    fetchOne(`/songs/${id}`, normalizeSong, () => mockSongs.find((s) => String(s.id) === String(id)) || null);

export const getAlbumById = (id) =>
    fetchOne(`/albums/${id}`, normalizeAlbum, () => {
        const album = mockAlbums.find((a) => String(a.id) === String(id));
        return album ? { ...album, songs: mockSongs.filter((s) => s.albumId === album.id) } : null;
    });

// Hồ sơ người đang đăng nhập (cache theo token) — để biết quyền và id khi backend chưa có API công khai.
let meCache = { token: null, promise: null };
const getMe = () => {
    const token = tokenStorage.getToken();
    if (!token) return Promise.resolve(null);
    if (meCache.token !== token) {
        meCache = { token, promise: userService.getProfile().catch(() => null) };
    }
    return meCache.promise;
};

// Nghệ sĩ đã thấy trong kết quả tìm kiếm: nhớ lại để mở được trang nghệ sĩ khi backend chưa có /artists/{id}
const SEEN_KEY = "mw_seen_artists";
const readSeenArtists = () => {
    try {
        return JSON.parse(sessionStorage.getItem(SEEN_KEY) || "{}");
    } catch {
        return {};
    }
};
const rememberArtists = (list) => {
    try {
        const map = readSeenArtists();
        list.forEach((a) => {
            if (a?.id != null) map[a.id] = { id: a.id, name: a.name, avatarUrl: a.avatarUrl };
        });
        sessionStorage.setItem(SEEN_KEY, JSON.stringify(map));
    } catch {
        /* bỏ qua */
    }
};

// Trang nghệ sĩ bằng dữ liệu thật mà frontend đọc được khi backend chưa có /artists/{id}:
//  - chính mình (ARTIST): hồ sơ + bài hát của mình (GET /artist/songs)
//  - nghệ sĩ khác: chỉ có tên/ảnh từ kết quả tìm kiếm (backend chưa có API đọc bài của người khác)
const realArtistById = async (id) => {
    const me = await getMe();
    if (me?.role === "ARTIST" && String(me.id) === String(id)) {
        const mine = await artistService.getMySongs().catch(() => []);
        return normalizeArtist({
            id: me.id,
            artistName: me.artistName,
            avatarUrl: me.avatarUrl,
            bio: me.bio,
            topSongs: mine,
        });
    }
    const seen = readSeenArtists()[id];
    return seen ? normalizeArtist({ ...seen, topSongs: [], albums: [] }) : null;
};

export const getArtistById = async (id) => {
    if (MOCK_MODE !== "on") {
        // 1) API công khai của backend (nếu đã có)
        try {
            const { data } = await api.get(`/artists/${id}`);
            if (data && typeof data === "object" && !Array.isArray(data)) return normalizeArtist(data);
        } catch {
            /* chưa có endpoint -> thử cách khác */
        }
        // 2) Dữ liệu thật đọc được theo quyền hiện tại
        const real = await realArtistById(id);
        if (real) return real;
        if (MOCK_MODE === "off") return null;
    }
    // 3) Dữ liệu mẫu
    const artist = mockArtists.find((a) => String(a.id) === String(id));
    return artist
        ? normalizeArtist({
              ...artist,
              topSongs: mockSongs.filter((s) => s.artistId === artist.id),
              albums: mockAlbums.filter((al) => al.artistId === artist.id),
          })
        : null;
};

// ----------------------------------------------------------------------------
// Tìm kiếm & thể loại
// ----------------------------------------------------------------------------
export const getGenres = () => genreService.getGenres();

export const getSongsByGenre = (genreId) =>
    fetchList("/songs", normalizeSong, () => mockSongs.filter((s) => String(s.genreId) === String(genreId)), { genreId });

const matchesSong = (song, q) =>
    matchesQuery(song.title, q) ||
    matchesQuery(song.artistName, q) ||
    (song.featuredArtists || []).some((a) => matchesQuery(a.artistName, q));

// Tìm bằng các API thật mà tài khoản hiện tại được phép gọi (backend chưa có /search công khai):
//  - ARTIST: bài hát của chính mình (mọi trạng thái) + nghệ sĩ khác (GET /artist/search-artists) + chính mình
//  - ADMIN : nghệ sĩ đang hoạt động trong GET /admin/users (admin chưa có API đọc bài hát)
//  - USER / chưa đăng nhập: backend không có API nào cho phép đọc -> trả null
const realSearch = async (q) => {
    const me = await getMe();
    if (!me) return null;

    if (me.role === "ARTIST") {
        const [mine, others] = await Promise.all([
            artistService.getMySongs().catch(() => []),
            artistService.searchArtists(q).catch(() => []),
        ]);
        const artists = Array.isArray(others) ? [...others] : [];
        if (me.artistName && matchesQuery(me.artistName, q)) {
            artists.unshift({ id: me.id, artistName: me.artistName, avatarUrl: me.avatarUrl });
        }
        return {
            songs: (Array.isArray(mine) ? mine : []).filter((s) => matchesSong(s, q)).map(normalizeSong),
            artists: artists.map(normalizeArtist),
            albums: [],
        };
    }

    if (me.role === "ADMIN") {
        const users = await adminService.getAllUsers().catch(() => []);
        const artists = users
            .filter((u) => u.role === "ARTIST" && u.accountStatus === "ACTIVE" && matchesQuery(u.artistName, q))
            .slice(0, 20)
            .map(normalizeArtist);
        return { songs: [], artists, albums: [] };
    }

    return null;
};

// Luôn trả về shape cố định { songs, albums, artists }.
// Thứ tự: GET /search của backend (nếu đã có) -> API thật theo quyền -> dữ liệu mẫu (nếu không bị tắt).
export const search = async (query) => {
    const q = (query || "").trim();
    const empty = { songs: [], albums: [], artists: [] };
    if (!q) return empty;

    if (MOCK_MODE !== "on") {
        try {
            const { data } = await api.get("/search", { params: { q } });
            if (data && typeof data === "object" && !Array.isArray(data)) {
                return {
                    songs: (data.songs || []).map(normalizeSong),
                    albums: (data.albums || []).map(normalizeAlbum),
                    artists: (data.artists || []).map(normalizeArtist),
                };
            }
        } catch {
            /* chưa có endpoint -> thử cách khác */
        }

        const real = await realSearch(q);
        if (real) {
            rememberArtists(real.artists);
            return real;
        }
        if (MOCK_MODE === "off") return empty;
    }

    return {
        songs: mockSongs.filter((s) => matchesQuery(s.title, q) || matchesQuery(s.artistName, q)).map(normalizeSong),
        albums: mockAlbums.filter((a) => matchesQuery(a.title, q) || matchesQuery(a.artistName, q)).map(normalizeAlbum),
        artists: mockArtists.filter((a) => matchesQuery(a.name, q)).map(normalizeArtist),
    };
};

export default {
    getTrendingSongs,
    getNewReleases,
    getPopularArtists,
    getSongById,
    getAlbumById,
    getArtistById,
    getGenres,
    getSongsByGenre,
    search,
};