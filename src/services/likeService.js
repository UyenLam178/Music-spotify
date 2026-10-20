import { readJson, writeJson } from "./storage";

// Backend CHƯA có API "thích bài hát" => lưu danh sách bài đã thích theo từng tài khoản
// trong localStorage. Khi backend bổ sung endpoint, chỉ cần sửa 2 hàm dưới đây.
const key = (userId) => `mw_likes_${userId}`;

export const getLikedSongs = (userId) => readJson(key(userId), []);
export const saveLikedSongs = (userId, list) => writeJson(key(userId), list);

// Chỉ lưu các trường cần để hiển thị + phát lại bài hát.
export const toLikedSnapshot = (song) => ({
    id: song.id,
    title: song.title,
    artistId: song.artistId,
    artistName: song.artistName,
    albumId: song.albumId,
    albumTitle: song.albumTitle,
    coverUrl: song.coverUrl,
    duration: song.duration,
    audioUrl: song.audioUrl,
    genreId: song.genreId,
});
