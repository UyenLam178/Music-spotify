import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePlayer } from "../../context/PlayerContext";
import { IconPlay, IconPause, IconMore } from "../Common/Icons";
import LikeButton from "../Common/LikeButton";

const formatDuration = (sec = 0) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
};

export default function SongRow({ song, index, songList, onAddToPlaylist, showPlays = false, playedAt = null }) {
  const { t } = useTranslation();
  const { currentSong, isPlaying, playSong, togglePlay, setPanelOpen } = usePlayer();
  const navigate = useNavigate();
  const isCurrent = currentSong?.id === song.id;

  const handlePlay = () => {
    if (isCurrent) togglePlay();
    else playSong(song, songList);
  };

  // Bấm vào tên/ảnh bài: phát và mở thanh "Đang phát" bên phải
  const handleOpen = () => {
    if (!isCurrent) playSong(song, songList);
    setPanelOpen(true);
  };

  return (
    <div className={`song-row${isCurrent ? " active" : ""}${showPlays ? " with-plays" : ""}`} onDoubleClick={handlePlay}>
      <div className="song-row-index" onClick={handlePlay}>
        {isCurrent && isPlaying ? (
          <IconPause className="song-row-icon" />
        ) : (
          <>
            <span className="index-number">{index + 1}</span>
            <IconPlay className="song-row-icon hover-only" />
          </>
        )}
      </div>

      <div className="song-row-info" onClick={handleOpen}>
        <img src={song.coverUrl} alt="" />
        <div>
          <p
            className="song-row-title song-row-title-link"
            title={t("songPage.viewDetail")}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/song/${song.id}`);
            }}
          >
            {song.title}
          </p>
          <p
            className="song-row-artist"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/artist/${song.artistId}`);
            }}
          >
            {song.artistName}
          </p>
        </div>
      </div>

      <div className="song-row-album">
        {playedAt ? new Date(playedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : song.albumTitle}
      </div>
      {showPlays && <div className="song-row-plays">{(song.playCount ?? 0).toLocaleString()}</div>}

      <div className="song-row-actions">
        <LikeButton song={song} />
        <span className="song-row-duration">{formatDuration(song.duration)}</span>
        {onAddToPlaylist && (
          <button
            className="btn-icon"
            aria-label={t("common.addToPlaylist")}
            onClick={() => onAddToPlaylist(song)}
          >
            <IconMore />
          </button>
        )}
      </div>
    </div>
  );
}
