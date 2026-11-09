// Ảnh nền nghệ thuật của từng thể loại: src/assets/genres/<tên>.(svg|webp|jpg|png)
// (tạo bằng scripts/generate-genre-art.py). Khớp theo TÊN thể loại vì id có thể khác giữa các môi trường.
const files = import.meta.glob("../assets/genres/*.{svg,webp,jpg,jpeg,png}", {
  eager: true,
  query: "?url",
  import: "default",
});

const ART = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split("/").pop().replace(/\.[^.]+$/, ""), url])
);

// "Hip-hop" -> "hiphop", "R&B" -> "rb", "US-UK" -> "usuk"
const artKey = (name = "") => name.toLowerCase().replace(/[^a-z0-9]/g, "");

export const getGenreArt = (name) => ART[artKey(name)] || null;
