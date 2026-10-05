import api from "./api";

// UC06
export const logout = async () => {
    const { data } = await api.post("/users/logout");
    return data;
};

// UC07 -> { id, username, email, fullName, avatarUrl, accountStatus, role,
//           artistRequestStatus, artistName, bio }
export const getProfile = async () => {
    const { data } = await api.get("/users/profile");
    return data;
};

// UC08
export const updateProfile = async ({ fullName }) => {
    const { data } = await api.put("/users/profile", { fullName });
    return data;
};

// UC10 -- multipart/form-data, part tên "file" -> User đã cập nhật
export const updateAvatar = async (file) => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.put("/users/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
};

// UC09 bước 1: kiểm tra mật khẩu hiện tại + gửi OTP qua email
export const requestChangePasswordOtp = async ({ currentPassword }) => {
    const { data } = await api.post("/users/password/otp", { currentPassword });
    return data;
};

// UC09 bước 2: xác thực OTP + đặt mật khẩu mới
export const changePassword = async ({ otp, newPassword }) => {
    const { data } = await api.put("/users/password", { otpCode: otp, newPassword });
    return data;
};

// UC13 bước 1: kiểm tra email mới chưa dùng + gửi OTP tới email mới
export const requestUpdateEmailOtp = async ({ newEmail }) => {
    const { data } = await api.post("/users/email/otp", { newEmail });
    return data;
};

// UC13 bước 2: xác thực OTP -> đổi email (email mới đã lưu cùng OTP ở otp_verifications.new_email)
export const updateEmail = async ({ otp }) => {
    const { data } = await api.put("/users/email", { otpCode: otp });
    return data;
};

// UC11
export const disableAccount = async ({ currentPassword }) => {
    const { data } = await api.put("/users/disable", { currentPassword });
    return data;
};

// UC12 (DELETE có body nên phải truyền qua `data`)
export const deleteAccount = async ({ currentPassword }) => {
    const { data } = await api.delete("/users", { data: { currentPassword } });
    return data;
};

// UC14
export const requestBecomeArtist = async ({ artistName, bio }) => {
    const { data } = await api.post("/users/artist-request", { artistName, bio });
    return data;
};

// UC19
export const updateArtistProfile = async ({ artistName, bio }) => {
    const { data } = await api.put("/users/artist-profile", { artistName, bio });
    return data;
};