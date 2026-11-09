import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IconPlay } from "../Common/Icons";

export default function PlaylistCard({ playlist }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div
      className="media-card"
      onClick={() => navigate(`/playlist/${playlist.id}`)}
      role="button"
    >
      <div className="media-card-cover">
        {playlist.coverImageUrl ? (
          <img src={playlist.coverImageUrl} alt={playlist.name} />
        ) : (
          <div className="playlist-cover-placeholder">♪</div>
        )}
        <button className="media-card-play" aria-label={t("player.play")} onClick={(e) => e.stopPropagation()}>
          <IconPlay />
        </button>
      </div>
      <p className="media-card-title" title={playlist.name}>
        {playlist.name}
      </p>
      <p className="media-card-sub">
        {[
          typeof playlist.songCount === "number" ? t("playlist.songsCount", { count: playlist.songCount }) : null,
          playlist.isPublic ? null : t("playlist.private"),
        ].filter(Boolean).join(" · ") || "Playlist"}
      </p>
    </div>
  );
}
