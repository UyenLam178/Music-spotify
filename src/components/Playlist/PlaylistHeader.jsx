import { useTranslation } from "react-i18next";
import { IconPlay } from "../Common/Icons";

export default function PlaylistHeader({ playlist, songCount = 0, totalDuration = 0, onPlay, onEdit }) {
  const { t } = useTranslation();
  const totalMinutes = Math.round(totalDuration / 60);

  return (
    <div className="playlist-header">
      <div className="playlist-header-cover">
        {playlist.coverImageUrl ? (
          <img src={playlist.coverImageUrl} alt={playlist.name} />
        ) : (
          <div className="playlist-cover-placeholder large">♪</div>
        )}
      </div>
      <div className="playlist-header-meta">
        <span className="playlist-header-type">
          {playlist.isPublic ? t("playlist.publicLabel") : t("playlist.privateLabel")}
        </span>
        <h1 className="playlist-header-title">{playlist.name}</h1>
        {playlist.description && (
          <p className="playlist-header-desc">{playlist.description}</p>
        )}
        <div className="playlist-header-stats">
          <span>{songCount} {t("album.songsCount")}</span>
          {totalMinutes > 0 && <span> · {t("playlist.approxMinutes", { count: totalMinutes })}</span>}
        </div>
      </div>
      <div className="playlist-header-actions">
        <button className="btn-icon play-btn" onClick={onPlay} aria-label={t("playlist.playAria")}>
          <IconPlay />
        </button>
        {onEdit && (
          <button className="btn btn-outline btn-sm" onClick={onEdit}>
            {t("common.edit")}
          </button>
        )}
      </div>
    </div>
  );
}
