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

  return (
    <div>
      <div className="genre-hero" style={{ background: "linear-gradient(180deg, #1db954 0%, transparent 100%)" }}>
        <h1>{t("common.likedSongs")}</h1>
        <p>{t("liked.count", { count: likedSongs.length })}</p>
      </div>

      {likedSongs.length === 0 ? (
        <p className="sb-hint">{t("liked.empty")}</p>
      ) : (
        <>
          <div style={{ margin: "16px 0" }}>
            <Button onClick={() => playQueue(likedSongs, 0)}>
              <IconPlay /> {t("genre.playAll")}
            </Button>
          </div>
          <div className="song-list">
            {likedSongs.map((song, i) => (
              <SongRow key={song.id} song={song} index={i} showPlays songList={likedSongs} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
