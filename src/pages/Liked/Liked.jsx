import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { useLikes } from "../../context/LikeContext";
import { usePlayer } from "../../context/PlayerContext";
import SongRow from "../../components/Music/SongRow";
import Button from "../../components/Common/Button";
import { IconPlay } from "../../components/Common/Icons";

export default function Liked() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { likedSongs } = useLikes();
  const { playQueue } = usePlayer();

  if (!isAuthenticated) {
    return (
      <div className="empty-state">
        <h2>{t("liked.loginPrompt")}</h2>
        <Button onClick={() => navigate("/login")}>{t("common.login")}</Button>
      </div>
    );
  }

  const title = t("common.likedSongs");
  const totalMinutes = Math.round(likedSongs.reduce((sum, x) => sum + (x.duration || 0), 0) / 60);

  return (
    <div className="liked-page">
      <span className="genres-arcs" aria-hidden="true" />

      <header className="liked-hero">
        <h1>
          {title.slice(0, title.lastIndexOf(" ") + 1)}
          <span>{title.slice(title.lastIndexOf(" ") + 1)}</span>
        </h1>
        <div className="liked-meta">
          <span>{t("liked.count", { count: likedSongs.length })}</span>
          {totalMinutes > 0 && <span>{t("playlist.approxMinutes", { count: totalMinutes })}</span>}
        </div>
        {likedSongs.length > 0 && (
          <button type="button" className="liked-play-btn" onClick={() => playQueue(likedSongs, 0)}>
            <IconPlay />
            {t("genre.playAll")}
          </button>
        )}
      </header>

      {likedSongs.length === 0 ? (
        <p className="liked-empty">{t("liked.empty")}</p>
      ) : (
        <div className="song-list">
          {likedSongs.map((song, i) => (
            <SongRow key={song.id} song={song} index={i} showPlays songList={likedSongs} />
          ))}
        </div>
      )}
    </div>
  );
}
