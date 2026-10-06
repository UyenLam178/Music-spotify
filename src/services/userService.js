import api from "./api";

export const logout = async () => (await api.post("/users/logout")).data;

export const getProfile = async () => (await api.get("/users/me/profile")).data;

export const updateProfile = async ({ fullName }) =>
    (await api.put("/users/me/profile", { fullName })).data;

// Backend: POST /me/avatar (multipart, part tên "file")
export const updateAvatar = async (file) => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post("/users/me/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
};

export const requestChangePasswordOtp = async ({ currentPassword }) =>
    (await api.post("/users/me/change-password/request-otp", { currentPassword })).data;

export const changePassword = async ({ otp, newPassword }) =>
    (await api.put("/users/me/change-password", { otpCode: otp, newPassword })).data;

export const requestUpdateEmailOtp = async ({ newEmail }) =>
    (await api.post("/users/me/email/request-otp", { newEmail })).data;

export const updateEmail = async ({ otp }) =>
    (await api.put("/users/me/email", { otpCode: otp })).data;

// Backend (AccountActionRequest) nhận field "password", không phải "currentPassword"
export const disableAccount = async ({ currentPassword }) =>
    (await api.put("/users/me/disable", { password: currentPassword })).data;

// Backend: PUT /me/delete (soft delete), không phải DELETE
export const deleteAccount = async ({ currentPassword }) =>
    (await api.put("/users/me/delete", { password: currentPassword })).data;

export const requestBecomeArtist = async ({ artistName, bio }) =>
    (await api.post("/users/me/artist-request", { artistName, bio })).data;

export const updateArtistProfile = async ({ artistName, bio }) =>
    (await api.put("/users/me/artist-profile", { artistName, bio })).data;