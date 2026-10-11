import { useEffect, useState } from "react";
import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import { useTranslation } from "react-i18next";

import {
  IconHome,
  IconSearch,
  IconLibrary,
  IconPlus,
} from "../Common/Icons";

import LanguageSwitcher from "../Common/LanguageSwitcher";

import { useAuth } from "../../context/AuthContext";
import { Role } from "../../utils/enums";

import * as playlistService
  from "../../services/playlistService";

export default function Sidebar() {
  const { t } = useTranslation();

  const {
    isAuthenticated,
    user,
  } = useAuth();

  const navigate = useNavigate();

  // ADMIN không có playlist
  const hasPlaylists = user?.role === Role.USER || user?.role === Role.ARTIST;

  const [playlists, setPlaylists] =
      useState([]);

  const [creating, setCreating] =
      useState(false);


  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    const onChanged = () => setReloadTick((n) => n + 1);
    window.addEventListener("mw:playlists-changed", onChanged);
    return () => window.removeEventListener("mw:playlists-changed", onChanged);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated || !hasPlaylists) {
      return undefined;
    }

    playlistService
        .getMyPlaylists()
        .then((data) => {
          if (cancelled) return;

          const list = Array.isArray(data)
              ? data
              : data?.content || [];

          setPlaylists(list);
        })
        .catch((error) => {
          console.error(
              "Không lấy được playlist:",
              error
          );

          if (!cancelled) {
            setPlaylists([]);
          }
        });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, hasPlaylists, reloadTick]);

  const navItemClass = ({
                          isActive,
                        }) =>
      `sb-nav-item${
          isActive
              ? " active"
              : ""
      }`;

  const handleCreatePlaylist =
      async () => {
        if (!isAuthenticated) {
          navigate("/login");
          return;
        }

        if (creating) return;

        setCreating(true);

        try {
          const playlist =
              await playlistService.createPlaylist(
                  {
                    name:
                        t(
                            "playlist.newPlaylist"
                        ),
                    description: "",
                    isPublic: false,
                  }
              );

          if (playlist) {
            setPlaylists((prev) => [
              playlist,
              ...prev,
            ]);

            if (playlist.id) {
              navigate(
                  `/playlist/${playlist.id}`
              );
            }
          }
        } catch (error) {
          console.error(
              "Không tạo được playlist:",
              error
          );
        } finally {
          setCreating(false);
        }
      };

  return (
      <aside className="sidebar">
        <div className="sb-brand">
          <span className="sb-logo-dot" />

          <span>
                    MySpotify
                </span>
        </div>

        <nav className="sb-nav">
          <NavLink
              to="/"
              end
              className={
                navItemClass
              }
          >
            <IconHome />
            <span>
                        {t(
                            "common.home"
                        )}
                    </span>
          </NavLink>

          <NavLink
              to="/search"
              className={
                navItemClass
              }
          >
            <IconSearch />
            <span>
                        {t(
                            "common.search"
                        )}
                    </span>
          </NavLink>

          <NavLink
              to="/search?section=genres"
              className={
                navItemClass
              }
          >
            <IconSearch />
            <span>
                        {t(
                            "common.genres"
                        )}
                    </span>
          </NavLink>
        </nav>

        {user?.role === Role.ARTIST && (
            <nav className="sb-nav">
              <div className="sb-section-label">{t("sidebar.artistArea")}</div>
              <NavLink to="/artist-studio" className={navItemClass}>
                <IconLibrary />
                <span>{t("studio.title")}</span>
              </NavLink>
            </nav>
        )}

        {user?.role === Role.ADMIN && (
            <nav className="sb-nav">
              <div className="sb-section-label">{t("sidebar.adminArea")}</div>
              <NavLink to="/admin" className={navItemClass}>
                <IconLibrary />
                <span>{t("admin.title")}</span>
              </NavLink>
            </nav>
        )}

        {user?.role !== Role.ADMIN && (
        <div className="sb-library">
          <div className="sb-library-head">
            <NavLink
                to="/library"
                className="sb-library-title"
            >
              <IconLibrary />

              <span>
                            {t(
                                "common.library"
                            )}
                        </span>
            </NavLink>

            <button
                type="button"
                className="btn-icon"
                title={
                  isAuthenticated
                      ? t(
                          "common.createPlaylist"
                      )
                      : t(
                          "auth.loginRequired"
                      )
                }
                onClick={
                  handleCreatePlaylist
                }
                disabled={creating}
            >
              <IconPlus />
            </button>
          </div>

          <div className="sb-playlist-list">
            {!isAuthenticated && (
                <p className="sb-hint">
                  {t(
                      "auth.loginRequired"
                  )}
                </p>
            )}

            {isAuthenticated && hasPlaylists &&
                playlists.length ===
                0 && (
                    <p className="sb-hint">
                      {t(
                          "playlist.empty"
                      )}
                    </p>
                )}

            {(isAuthenticated && hasPlaylists ? playlists : []).map(
                (playlist) => (
                    <NavLink
                        key={
                          playlist.id
                        }
                        to={`/playlist/${playlist.id}`}
                        className="sb-playlist-item"
                    >
                      <div className="sb-playlist-cover">
                        {playlist.coverImageUrl ? (
                            <img
                                src={
                                  playlist.coverImageUrl
                                }
                                alt=""
                            />
                        ) : (
                            <span>
                                            ♪
                                        </span>
                        )}
                      </div>

                      <div className="sb-playlist-meta">
                                    <span className="sb-playlist-name">
                                        {
                                          playlist.name
                                        }
                                    </span>

                        <span className="sb-playlist-sub">
                                        {t(
                                            "common.playlists"
                                        )}

                          {!playlist.isPublic &&
                              ` · ${t(
                                  "playlist.private"
                              )}`}
                                    </span>
                      </div>
                    </NavLink>
                )
            )}
          </div>
        </div>

        )}

        <LanguageSwitcher />
      </aside>
  );
}