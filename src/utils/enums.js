// Các enum dùng chung trong ứng dụng.
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

// Trạng thái bài hát
export const SongStatus = Object.freeze({
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    HIDDEN: "HIDDEN",
    DELETED: "DELETED",
});
