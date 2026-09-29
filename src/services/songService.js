import api from "./api";
import {
    mockSongs,
    mockAlbums,
    mockArtists,
    mockGenres,
} from "./mockData";

// ============================================================================
// songService.js
//
// Nguyên tắc: LUÔN ưu tiên gọi API thật từ backend Spring Boot trước.
// Nếu backend chưa có endpoint đó (404/501) hoặc request lỗi (mất mạng, 500,
// CORS...), service sẽ tự fallback về mock data để giao diện không bị vỡ.
//
// => Khi backend cập nhật / bổ sung endpoint cho Song, Album, Artist, Search,
//    Genre thì KHÔNG cần sửa gì ở đây hay ở phía component: lần gọi tiếp theo
//    api.get(...) sẽ thành công và dữ liệu thật sẽ tự động được dùng thay cho
//    mock, vì mock chỉ được dùng trong khối catch (khi request that bai).
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
    str
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

const matchesQuery = (text, query) => normalizeText(text).includes(normalizeText(query));

// ----------------------------------------------------------------------------
// Trang chủ
// ----------------------------------------------------------------------------

// Lấy bài hát thịnh hành
export const getTrendingSongs = async () => {
    try {
        const { data } = await api.get("/songs/trending");
        return Array.isArray(data) ? data.map(normalizeSong) : data;
    } catch (error) {
        console.warn("Backend chưa có /songs/trending → dùng mock data");
        return mockSongs;
    }
};

// Lấy album mới phát hành
export const getNewReleases = async () => {
    try {
        const { data } = await api.get("/albums/new-releases");
        return Array.isArray(data) ? data.map(normalizeAlbum) : data;
    } catch (error) {
        console.warn("Backend chưa có /albums/new-releases → dùng mock data");
        return mockAlbums;
    }
};

// Lấy nghệ sĩ nổi bật
export const getPopularArtists = async () => {
    try {
        const { data } = await api.get("/artists/popular");
        return Array.isArray(data) ? data.map(normalizeArtist) : data;
    } catch (error) {
        console.warn("Backend chưa có /artists/popular → dùng mock data");
        return mockArtists;
    }
};

// ----------------------------------------------------------------------------
// Chi tiết bài hát / album / nghệ sĩ
// (Artist.jsx và Album.jsx cần các hàm này — trước đây bị thiếu nên khi bấm
// vào 1 nghệ sĩ hoặc 1 album, component crash vì gọi hàm undefined → trang
// trắng/đen. Nay đã bổ sung đầy đủ kèm fallback mock để không còn bị lỗi.)
// ----------------------------------------------------------------------------

// Lấy chi tiết 1 bài hát theo id
export const getSongById = async (id) => {
    try {
        const { data } = await api.get(`/songs/${id}`);
        return normalizeSong(data);
    } catch (error) {
        console.warn(`Backend chưa có /songs/${id} → dùng mock data`);
        const song = mockSongs.find((s) => String(s.id) === String(id));
        return song ? normalizeSong(song) : null;
    }
};

// Lấy chi tiết 1 album theo id, kèm danh sách bài hát trong album
export const getAlbumById = async (id) => {
    try {
        const { data } = await api.get(`/albums/${id}`);
        return normalizeAlbum(data);
    } catch (error) {
        console.warn(`Backend chưa có /albums/${id} → dùng mock data`);
        const album = mockAlbums.find((a) => String(a.id) === String(id));
        if (!album) return null;
        return normalizeAlbum({
            ...album,
            songs: mockSongs.filter((s) => s.albumId === album.id),
        });
    }
};

// Lấy chi tiết 1 nghệ sĩ theo id, kèm bài hát nổi bật và album
export const getArtistById = async (id) => {
    try {
        const { data } = await api.get(`/artists/${id}`);
        return normalizeArtist(data);
    } catch (error) {
        console.warn(`Backend chưa có /artists/${id} → dùng mock data`);
        const artist = mockArtists.find((a) => String(a.id) === String(id));
        if (!artist) return null;
        return normalizeArtist({
            ...artist,
            topSongs: mockSongs.filter((s) => s.artistId === artist.id),
            albums: mockAlbums.filter((al) => al.artistId === artist.id),
        });
    }
};

// ----------------------------------------------------------------------------
// Tìm kiếm & thể loại (Search.jsx cần getGenres() và search() — trước đây
// chưa được export nên trang tìm kiếm bị crash khi mở /search hoặc gõ tìm
// kiếm. Nay đã bổ sung, ưu tiên gọi backend thật, fallback lọc trên mock.)
// ----------------------------------------------------------------------------

// Lấy danh sách thể loại nhạc (để hiển thị lưới "Duyệt tất cả")
export const getGenres = async () => {
    try {
        const { data } = await api.get("/genres");
        return data;
    } catch (error) {
        console.warn("Backend chưa có /genres → dùng mock data");
        return mockGenres;
    }
};

// Tìm kiếm bài hát / album / nghệ sĩ theo từ khoá.
// Luôn trả về shape cố định { songs, albums, artists } để Search.jsx
// không cần biết dữ liệu đến từ backend thật hay từ mock.
export const search = async (query) => {
    const q = (query || "").trim();
    if (!q) return { songs: [], albums: [], artists: [] };

    try {
        const { data } = await api.get("/search", { params: { q } });
        return {
            songs: (data.songs || []).map(normalizeSong),
            albums: (data.albums || []).map(normalizeAlbum),
            artists: (data.artists || []).map(normalizeArtist),
        };
    } catch (error) {
        console.warn("Backend chưa có /search → tìm kiếm trên mock data");
        return {
            songs: mockSongs.filter(
                (s) => matchesQuery(s.title, q) || matchesQuery(s.artistName, q)
            ),
            albums: mockAlbums.filter(
                (a) => matchesQuery(a.title, q) || matchesQuery(a.artistName, q)
            ),
            artists: mockArtists.filter((a) => matchesQuery(a.name, q)),
        };
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
    search,
};