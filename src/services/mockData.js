// Backend hiện chưa có entity/controller cho Song, Album, Artist (chỉ mới có
// DTO cho User & Playlist). File này cung cấp dữ liệu mẫu để giao diện chạy
// được ngay hôm nay; songService.js sẽ ưu tiên gọi API thật và tự fallback
// về data này nếu backend chưa sẵn sàng — khi backend bổ sung endpoint,
// chỉ cần bỏ phần fallback là xong, không cần đổi UI.

const cover = (seed, color = "1DB954") =>
    `https://placehold.co/400x400/${color}/191414?text=${encodeURIComponent(seed)}`;

export const mockArtists = [
    { id: "a1", name: "Sơn Tùng M-TP", avatarUrl: cover("STMTP", "191414"), followers: 4200000 },
    { id: "a2", name: "Hoàng Dũng", avatarUrl: cover("HD", "3D3D3D"), followers: 850000 },
    { id: "a3", name: "Vũ.", avatarUrl: cover("VU", "1DB954"), followers: 1200000 },
    { id: "a4", name: "Đen Vâu", avatarUrl: cover("DV", "535353"), followers: 3100000 },
    { id: "a5", name: "MCK", avatarUrl: cover("MCK", "121212"), followers: 980000 },
    { id: "a6", name: "AMEE", avatarUrl: cover("AMEE", "E91E63"), followers: 1600000 },
];

export const mockAlbums = [
    { id: "al1", title: "Sky Tour", artistId: "a1", artistName: "Sơn Tùng M-TP", coverUrl: cover("Sky Tour") },
    { id: "al2", title: "One", artistId: "a3", artistName: "Vũ.", coverUrl: cover("One", "0D72A9") },
    { id: "al3", title: "Show Của Đen", artistId: "a4", artistName: "Đen Vâu", coverUrl: cover("Show Của Đen", "8D6E63") },
    { id: "al4", title: "Trong Lòng Bàn Tay", artistId: "a2", artistName: "Hoàng Dũng", coverUrl: cover("TLBT", "5D4037") },
    { id: "al5", title: "Dreamee", artistId: "a6", artistName: "AMEE", coverUrl: cover("Dreamee", "AD1457") },
    { id: "al6", title: "Yên", artistId: "a5", artistName: "MCK", coverUrl: cover("Yen", "263238") },
];

const track = (id, title, artistId, artistName, albumId, albumTitle, coverUrl, duration) => ({
    id,
    title,
    artistId,
    artistName,
    albumId,
    albumTitle,
    coverUrl,
    duration, // giây
    audioUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
});

export const mockSongs = [
    track("s1", "Chúng Ta Của Hiện Tại", "a1", "Sơn Tùng M-TP", "al1", "Sky Tour", cover("CTCHT"), 289),
    track("s2", "Lạc Trôi", "a1", "Sơn Tùng M-TP", "al1", "Sky Tour", cover("Lạc Trôi"), 246),
    track("s3", "Bước Qua Nhau", "a2", "Hoàng Dũng", "al4", "Trong Lòng Bàn Tay", cover("BQN", "5D4037"), 258),
    track("s4", "Cứ Chill Thôi", "a3", "Vũ.", "al2", "One", cover("CCT", "0D72A9"), 231),
    track("s5", "Đi Về Nhà", "a4", "Đen Vâu", "al3", "Show Của Đen", cover("DVN", "8D6E63"), 275),
    track("s6", "Trốn Tìm", "a4", "Đen Vâu", "al3", "Show Của Đen", cover("TT", "8D6E63"), 240),
    track("s7", "Sao Anh Chưa Về Nhà", "a3", "Vũ.", "al2", "One", cover("SACVN", "0D72A9"), 265),
    track("s8", "Anh Nhớ Em Đứa Nào", "a6", "AMEE", "al5", "Dreamee", cover("ANEDN", "AD1457"), 210),
    track("s9", "Trời Giấu Trời Mang Đi", "a2", "Hoàng Dũng", "al4", "Trong Lòng Bàn Tay", cover("TGTMD", "5D4037"), 255),
    track("s10", "Bốn Chữ Lắm", "a5", "MCK", "al6", "Yên", cover("BCL", "263238"), 198),
    track("s11", "Hào Quang", "a5", "MCK", "al6", "Yên", cover("HQ", "263238"), 223),
    track("s12", "Dễ Đến Dễ Đi", "a6", "AMEE", "al5", "Dreamee", cover("DDDD", "AD1457"), 205),
];

export const mockGenres = [
    { id: "g1", name: "V-Pop", color: "8D67AB" },
    { id: "g2", name: "Rap Việt", color: "E1118C" },
    { id: "g3", name: "Ballad", color: "1E3264" },
    { id: "g4", name: "Chill", color: "148A08" },
    { id: "g5", name: "Indie", color: "BC5900" },
    { id: "g6", name: "Acoustic", color: "477D95" },
];
