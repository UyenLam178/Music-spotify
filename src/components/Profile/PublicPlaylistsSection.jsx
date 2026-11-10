import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import * as playlistService from "../../services/playlistService";
import PlaylistCard from "../Playlist/PlaylistCard";

// Mục "Playlist" trong hồ sơ: chỉ liệt kê các playlist người dùng đã để CÔNG KHAI
// (GET /playlists/users/{userId}). Nếu chưa có playlist công khai nào thì ẩn cả mục.
// Tự tải lại khi playlist thay đổi (tạo / xoá / đổi công khai ↔ riêng tư).
// variant="profile": khung thẻ trong trang Hồ sơ · variant="page": mục thường (trang Nghệ sĩ).
export default function PublicPlaylistsSection({ userId: userIdProp, variant = "profile" }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = userIdProp ?? user?.id;
  const [playlists, setPlaylists] = useState(null); // null = đang tải

  useEffect(() => {
    if (!userId) return undefined;
    setPlaylists(null);
    let cancelled = false;
    const load = () =>
      playlistService
        .getPublicPlaylists(userId)
        .then((data) => {
          if (cancelled) return;
          // Backend (Jackson) có thể trả `isPublic` hoặc `public`
          setPlaylists(data.filter((p) => (p.isPublic ?? p.public) !== false));
        })
        .catch((err) => {
          // Không báo lỗi lên UI (mục chỉ là phần phụ) nhưng ghi ra console để dễ gỡ lỗi
          console.warn("[PublicPlaylists] không tải được playlist công khai của user", userId, err?.response?.status, err?.response?.data || err);
          if (!cancelled) setPlaylists([]);
        });
    load();
    window.addEventListener(playlistService.PLAYLISTS_CHANGED, load);
    return () => {
      cancelled = true;
      window.removeEventListener(playlistService.PLAYLISTS_CHANGED, load);
    };
  }, [userId]);

  const isEmpty = Array.isArray(playlists) && playlists.length === 0;

  // Trang cá nhân/Hồ sơ: không có thì ẩn cả mục. Trang nghệ sĩ: luôn hiện tiêu đề,
  // chưa có playlist công khai thì để dòng thông báo (dễ kiểm tra mục có chạy hay không).
  if (variant !== "page" && (playlists === null || isEmpty)) return null;

  const grid = (
    <div className="card-grid">
      {(playlists || []).map((pl) => (
        <PlaylistCard key={pl.id} playlist={pl} />
      ))}
    </div>
  );

  if (variant === "page") {
    return (
      <section className="section">
        <div className="section-head">
          <h2>{t("profile.playlistsTitle")}</h2>
        </div>
        {playlists === null ? null : isEmpty ? (
          <p className="sb-hint">{t("artist.noPlaylists")}</p>
        ) : (
          grid
        )}
      </section>
    );
  }

  return (
    <section className="profile-section profile-playlists">
      <h2>{t("profile.playlistsTitle")}</h2>
      {grid}
    </section>
  );
}
