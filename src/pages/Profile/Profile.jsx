import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { resolveAssetUrl } from "../../services/api";
import { IconUser } from "../../components/Common/Icons";
import ProfileInfoSection from "../../components/Profile/ProfileInfoSection";
import AvatarSection from "../../components/Profile/AvatarSection";
import EmailSection from "../../components/Profile/EmailSection";
import PasswordSection from "../../components/Profile/PasswordSection";
import ArtistSection from "../../components/Profile/ArtistSection";
import AccountSection from "../../components/Profile/AccountSection";
import { maskEmail } from "../../utils/mask";

// Trang Hồ sơ = nhóm use case "II. User" của module Người dùng:
//   UC07/08 thông tin cá nhân · UC10 ảnh đại diện · UC13 email · UC09 mật khẩu
//   UC14/19 nghệ sĩ · UC11 vô hiệu hoá · UC12 xoá tài khoản (UC06 Đăng xuất ở menu Header)
export default function Profile() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const avatar = resolveAssetUrl(user?.avatarUrl);

    return (
        <div className="profile-page">
            <div className="profile-hero">
                <div className="profile-avatar-lg">
                    {avatar ? <img src={avatar} alt="" /> : <IconUser />}
                </div>
                <div>
                    <span className="playlist-header-type">{t("profile.label")}</span>
                    <h1 className="playlist-header-title">
                        {user?.fullName || user?.username || t("profile.defaultName")}
                    </h1>
                    <p className="sb-hint">
                        {user?.username && `@${user.username} · `}
                        {maskEmail(user?.email)}
                        {user?.role && <span className={`role-badge role-${user.role.toLowerCase()}`}>{t(`role.${user.role}`)}</span>}
                    </p>
                </div>
            </div>

            <div className="profile-grid">
                <ProfileInfoSection />
                <AvatarSection />
                <EmailSection />
                <PasswordSection />
                <ArtistSection />
                <AccountSection />
            </div>
        </div>
    );
}
