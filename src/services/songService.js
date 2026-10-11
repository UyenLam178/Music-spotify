import api from "./api";
import * as genreService from "./genreService";
import { withMock } from "./mockMode";
import { mockSongs, mockAlbums, mockArtists } from "./mockData";

// ============================================================================
// songService.js
//
// Luôn gọi API thật của backend trước. Việc có dùng dữ liệu mẫu (mock) hay
// không do mockMode.js quyết định (VITE_USE_MOCK = auto | on | off, xem .env):
// ở chế độ auto, endpoint nào backend đã có thì tự dùng dữ liệu thật, mock chỉ
// chạy khi endpoint đó chưa có / backend lỗi. Không trộn mock với dữ liệu thật.
// ============================================================================

// Chuẩn hoá 1 bài hát trả về từ backend (phòng khi backend đặt tên field khác
// một chút, ví dụ artist.name thay vì artistName) để UI luôn nhận đúng shape.
const normalizeSong = (song) => {
    if (!song) return song;
    return {
        id: song.id,
        title: song.title,
        artistId: song.artistId ?? song.artist?.id,
        artistName: song.artistName ?? song.artist?.name,
        albumId: song.albumId ?? song.album?.id,
        albumTitle: song.albumTitle ?? song.album?.title,
        coverUrl: song.coverUrl ?? song.imageUrl ?? song.album?.coverUrl,
        duration: song.duration ?? song.durationInSeconds ?? 0,
        audioUrl: song.audioUrl ?? song.fileUrl ?? song.url,
        genreId: song.genreId ?? song.genre?.id,
        ...song,
    };
};

const normalizeAlbum = (album) => {
    if (!album) return album;
    return {
        id: album.id,
        title: album.title,
        artistId: album.artistId ?? album.artist?.id,
        artistName: album.artistName ?? album.artist?.name,
        coverUrl: album.coverUrl ?? album.imageUrl,
        songs: Array.isArray(album.songs) ? album.songs.map(normalizeSong) : album.songs,
        ...album,
    };
};

const normalizeArtist = (artist) => {
    if (!artist) return artist;
    return {
        id: artist.id,
        name: artist.name,
        avatarUrl: artist.avatarUrl ?? artist.imageUrl,
        followers: artist.followers ?? artist.followerCount,
        topSongs: Array.isArray(artist.topSongs) ? artist.topSongs.map(normalizeSong) : artist.topSongs,
        albums: Array.isArray(artist.albums) ? artist.albums.map(normalizeAlbum) : artist.albums,
        ...artist,
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
            url
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
        const { data } = await withMock(() => api.get(url), () => ({ data: mockOne() }), url);
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

export const getArtistById = (id) =>
    fetchOne(`/artists/${id}`, normalizeArtist, () => {
        const artist = mockArtists.find((a) => String(a.id) === String(id));
        return artist
            ? {
                  ...artist,
                  topSongs: mockSongs.filter((s) => s.artistId === artist.id),
                  albums: mockAlbums.filter((al) => al.artistId === artist.id),
              }
            : null;
    });

// ----------------------------------------------------------------------------
// Tìm kiếm & thể loại
// ----------------------------------------------------------------------------
export const getGenres = () => genreService.getGenres();

export const getSongsByGenre = (genreId) =>
    fetchList("/songs", normalizeSong, () => mockSongs.filter((s) => String(s.genreId) === String(genreId)), { genreId });

// Luôn trả về shape cố định { songs, albums, artists }
export const search = async (query) => {
    const q = (query || "").trim();
    const empty = { songs: [], albums: [], artists: [] };
    if (!q) return empty;

    try {
        const { data } = await withMock(
            () => api.get("/search", { params: { q } }),
            () => ({
                data: {
                    songs: mockSongs.filter((s) => matchesQuery(s.title, q) || matchesQuery(s.artistName, q)),
                    albums: mockAlbums.filter((a) => matchesQuery(a.title, q) || matchesQuery(a.artistName, q)),
                    artists: mockArtists.filter((a) => matchesQuery(a.name, q)),
                },
            }),
            "/search"
        );
        return {
            songs: (data?.songs || []).map(normalizeSong),
            albums: (data?.albums || []).map(normalizeAlbum),
            artists: (data?.artists || []).map(normalizeArtist),
        };
    } catch (error) {
        console.error("Tìm kiếm thất bại:", error?.response?.status ?? error.message);
        return empty;
    }
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