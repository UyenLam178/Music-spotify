// Các enum khớp với class diagram / ERD (chuỗi y hệt giá trị lưu ở backend).
export const Role = Object.freeze({ USER: "USER", ARTIST: "ARTIST", ADMIN: "ADMIN" });

export const AccountStatus = Object.freeze({
    UNVERIFIED: "UNVERIFIED",
    ACTIVE: "ACTIVE",
    DISABLED: "DISABLED",
    DELETED: "DELETED",
});

export const ArtistRequestStatus = Object.freeze({
    NONE: "NONE",
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
});

// Trạng thái bài hát (SongStatus ở backend)
export const SongStatus = Object.freeze({
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    HIDDEN: "HIDDEN",
    DELETED: "DELETED",
});
