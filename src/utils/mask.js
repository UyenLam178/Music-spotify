// Che bớt dữ liệu nhạy cảm khi HIỂN THỊ trên giao diện (chống người đứng sau nhìn lén,
// chụp màn hình...). Đây chỉ là che hiển thị: dữ liệu vẫn nằm trong response của API.

// "nguyenvan@gmail.com" -> "ng*******@gmail.com"
export const maskEmail = (email) => {
    if (!email || !email.includes("@")) return email || "";
    const [name, domain] = email.split("@");
    const visible = name.slice(0, Math.min(2, name.length));
    return `${visible}${"*".repeat(Math.max(name.length - visible.length, 3))}@${domain}`;
};
