import { readJson, writeJson } from "./storage";

// ============================================================================
// genreService.js
//
// Danh sách thể loại gồm bộ thể loại mặc định bên dưới và các thể loại Admin tự thêm
// (lưu trên trình duyệt).
//
// Đây là DANH MỤC cấu hình, KHÔNG phải dữ liệu mẫu: không có bài hát/nghệ sĩ giả nào.
// ============================================================================

const CUSTOM_KEY = "mw_custom_genres";

export const DEFAULT_GENRES = [
    { id: "g1", name: "V-Pop", color: "8D67AB" },
    { id: "g2", name: "Rap Việt", color: "E1118C" },
    { id: "g3", name: "Ballad", color: "1E3264" },
    { id: "g4", name: "Chill", color: "148A08" },
    { id: "g5", name: "Indie", color: "BC5900" },
    { id: "g6", name: "Acoustic", color: "477D95" },
];

export const GENRE_PALETTE = [
    "1DB954", "E8115B", "E1118C", "8D67AB", "1E3264", "477D95",
    "509BF5", "148A08", "BC5900", "F59B23", "D84000", "535353",
];

export const normalizeHex = (value = "") => {
    const hex = String(value).replace(/^#/, "").trim().toUpperCase();
    return /^[0-9A-F]{6}$/.test(hex) ? hex : "535353";
};

export const normalizeText = (str = "") =>
    str.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").trim();

const normalizeGenre = (g) => ({ ...g, id: String(g.id), color: normalizeHex(g.color) });

const getCustom = () => readJson(CUSTOM_KEY, []);

export const getGenres = async () => {
    const seen = new Set(DEFAULT_GENRES.map((g) => String(g.id)));
    const custom = getCustom().filter((g) => !seen.has(String(g.id)));
    return [...DEFAULT_GENRES, ...custom].map(normalizeGenre);
};

export const getGenreById = async (id) => (await getGenres()).find((g) => String(g.id) === String(id)) || null;

// Admin thêm thể loại: { name, color } (color = mã hex 6 ký tự, có hoặc không có #)
export const createGenre = async ({ name, color }) => {
    const clean = name.trim();
    const existing = await getGenres();
    if (existing.some((g) => normalizeText(g.name) === normalizeText(clean))) {
        throw new Error("Genre already exists");
    }
    const genre = { id: `c${Date.now()}`, name: clean, color: normalizeHex(color), custom: true };
    writeJson(CUSTOM_KEY, [...getCustom(), genre]);
    return normalizeGenre(genre);
};
