// Ảnh bìa mặc định (SVG data-URI) khi bài hát không có ảnh bìa.
export const placeholderCover = (text = "", color = "1DB954") => {
    const raw = (text || "").trim().charAt(0).toUpperCase();
    const label = !raw || /[<>&"']/.test(raw) ? "♪" : raw;
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">` +
        `<rect width="400" height="400" fill="#${color}"/>` +
        `<text x="50%" y="54%" font-family="Arial" font-size="160" font-weight="700" ` +
        `fill="#191414" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
