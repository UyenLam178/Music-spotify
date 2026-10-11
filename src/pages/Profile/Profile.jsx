import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { resolveAssetUrl } from "../../services/api";
import { Role, ArtistRequestStatus } from "../../utils/enums";
import { IconUser } from "../../components/Common/Icons";
import ProfileInfoSection from "../../components/Profile/ProfileInfoSection";
import AvatarSection from "../../components/Profile/AvatarSection";
import EmailSection from "../../components/Profile/EmailSection";
import PasswordSection from "../../components/Profile/PasswordSection";
import ArtistSection from "../../components/Profile/ArtistSection";
import AccountSection from "../../components/Profile/AccountSection";
import { maskEmail } from "../../utils/mask";

// Trang Hồ sơ (bố cục kiểu mạng xã hội):
//   - Ảnh bìa + avatar + tên, 2 tab: "Giới thiệu" (chỉ xem) và "Chỉnh sửa".
//   - Tab "Chỉnh sửa": menu danh mục bên trái, mỗi danh mục là một khung riêng bên phải.
//   UC07/08 thông tin · UC10 ảnh đại diện · UC13 email · UC09 mật khẩu
//   UC14/19 nghệ sĩ · UC11 vô hiệu hoá · UC12 xoá tài khoản

function InfoRow({ label, children }) {
    return (
        <div className="about-row">
            <span className="about-label">{label}</span>
            <span className="about-value">{children || "—"}</span>
        </div>
    );
}

function AboutTab({ user }) {
    const { t } = useTranslation();
    const showArtist =
        user?.role === Role.ARTIST ||
        (user?.role === Role.USER && user?.artistRequestStatus && user.artistRequestStatus !== ArtistRequestStatus.NONE);

    return (
        <div className="about-grid">
            <section className="profile-card">
                <h2>{t("profile.personalInfo")}</h2>
                <InfoRow label={t("profile.usernameLabel")}>@{user?.username}</InfoRow>
                <InfoRow label={t("profile.fullNameLabel")}>{user?.fullName}</InfoRow>
            </section>

            <section className="profile-card">
                <h2>{t("profile.contact")}</h2>
                <InfoRow label={t("auth.emailLabel")}>{maskEmail(user?.email)}</InfoRow>
            </section>

            <section className="profile-card">
                <h2>{t("profile.accountInfo")}</h2>
                <InfoRow label={t("admin.colRole")}>
                    <span className={`role-badge role-${(user?.role || "").toLowerCase()}`}>{t(`role.${user?.role}`)}</span>
                </InfoRow>
                <InfoRow label={t("admin.colStatus")}>{t(`accountStatus.${user?.accountStatus}`, user?.accountStatus)}</InfoRow>
            </section>

            {showArtist && (
                <section className="profile-card">
                    <h2>{t("artistSection.profileTitle")}</h2>
                    {user.role === Role.ARTIST ? (
                        <>
                            <InfoRow label={t("artistSection.nameLabel")}>{user.artistName}</InfoRow>
                            <InfoRow label={t("artistSection.bioLabel")}>{user.bio}</InfoRow>
                        </>
                    ) : (
                        <InfoRow label={t("profile.requestStatus")}>
                            {t(`profile.requestState.${user.artistRequestStatus}`)}
                        </InfoRow>
                    )}
                </section>
            )}
        </div>
    );
}

export default function Profile() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [tab, setTab] = useState("about"); // about | edit
    const [section, setSection] = useState("info");
    const avatar = resolveAssetUrl(user?.avatarUrl);
    const role = (user?.role || "user").toLowerCase();
    const canBeArtist = user?.role === Role.USER || user?.role === Role.ARTIST;

    const menu = [
        { id: "info", label: t("profile.personalInfo"), node: <ProfileInfoSection /> },
        { id: "avatar", label: t("profile.avatar"), node: <AvatarSection /> },
        { id: "email", label: t("profile.changeEmail"), node: <EmailSection /> },
        { id: "password", label: t("profile.changePassword"), node: <PasswordSection /> },
        ...(canBeArtist
            ? [{ id: "artist", label: t("artistSection.profileTitle"), node: <ArtistSection /> }]
            : []),
        { id: "account", label: t("profile.accountManage"), node: <AccountSection />, danger: true },
    ];
    const active = menu.find((m) => m.id === section) || menu[0];

    return (
        <div className="profile-page">
            <div className="profile-card profile-top">
                <div className={`profile-cover cover-${role}`} />
                <div className="profile-top-body">
                    <div className="profile-avatar-lg">{avatar ? <img src={avatar} alt="" /> : <IconUser />}</div>
                    <div className="profile-top-meta">
                        <h1>{user?.fullName || user?.username || t("profile.defaultName")}</h1>
                        <p className="sb-hint">
                            {user?.username && `@${user.username}`}
                            {user?.role && <span className={`role-badge role-${role}`}>{t(`role.${user.role}`)}</span>}
                        </p>
                    </div>
                </div>
                <div className="profile-tabs" role="tablist">
                    <button role="tab" aria-selected={tab === "about"} className={tab === "about" ? "active" : ""} onClick={() => setTab("about")}>
                        {t("profile.tabAbout")}
                    </button>
                    <button role="tab" aria-selected={tab === "edit"} className={tab === "edit" ? "active" : ""} onClick={() => setTab("edit")}>
                        {t("profile.tabEdit")}
                    </button>
                </div>
            </div>

            {tab === "about" ? (
                <AboutTab user={user} />
            ) : (
                <div className="edit-layout">
                    <nav className="edit-menu" aria-label={t("profile.tabEdit")}>
                        {menu.map((m) => (
                            <button
                                key={m.id}
                                className={`${m.id === active.id ? "active" : ""}${m.danger ? " danger" : ""}`}
                                onClick={() => setSection(m.id)}
                            >
                                {m.label}
                            </button>
                        ))}
                    </nav>
                    <div className="edit-panel">{active.node}</div>
                </div>
            )}
        </div>
    );
}
