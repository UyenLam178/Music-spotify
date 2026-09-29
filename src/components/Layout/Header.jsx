import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { resolveAssetUrl } from "../../services/api";
import { Role } from "../../utils/enums";
import { IconChevronDown, IconUser, IconLogout } from "../Common/Icons";
import SearchBar from "../Search/SearchBar";

export default function Header() {
  const { t } = useTranslation();
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate("/");
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="nav-arrows">
          <button className="btn-icon" onClick={() => navigate(-1)} aria-label={t("header.back")}>
            ‹
          </button>
          <button className="btn-icon" onClick={() => navigate(1)} aria-label={t("header.forward")}>
            ›
          </button>
        </div>
        <SearchBar />
      </div>

      <div className="header-right" ref={menuRef}>
        {isAuthenticated ? (
          <div className="user-menu">
            <button className="user-pill" onClick={() => setMenuOpen((o) => !o)}>
              <span className="user-avatar">
                {user?.avatarUrl ? <img src={resolveAssetUrl(user.avatarUrl)} alt="" /> : <IconUser />}
              </span>
              <span className="user-name">{user?.fullName || user?.username || t("header.you")}</span>
              <IconChevronDown />
            </button>
            {menuOpen && (
              <div className="user-dropdown">
                <button onClick={() => { setMenuOpen(false); navigate("/profile"); }}>
                  <IconUser /> {t("header.account")}
                </button>
                {user?.role === Role.ADMIN && (
                  <button onClick={() => { setMenuOpen(false); navigate("/admin"); }}>
                    <IconUser /> {t("header.admin")}
                  </button>
                )}
                <div className="dropdown-divider" />
                <button onClick={handleLogout}>
                  <IconLogout /> {t("common.logout")}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="auth-buttons">
            <button className="btn btn-ghost" onClick={() => navigate("/register")}>
              {t("common.register")}
            </button>
            <button className="btn btn-primary" onClick={() => navigate("/login")}>
              {t("common.login")}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
