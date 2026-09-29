import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePlayer } from "../../context/PlayerContext";
import { IconPlay, IconPause, IconHeart, IconMore } from "../Common/Icons";

const formatDuration = (sec = 0) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
};

export default function SongRow({ song, index, songList, onAddToPlaylist }) {
  const { t } = useTranslation();
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const navigate = useNavigate();
  const isCurrent = currentSong?.id === song.id;

  const handlePlay = () => {
    if (isCurrent) togglePlay();
    else playSong(song, songList);
  };

  return (
    <div className={`song-row${isCurrent ? " active" : ""}`} onDoubleClick={handlePlay}>
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

      <div className="song-row-info" onClick={handlePlay}>
        <img src={song.coverUrl} alt="" />
        <div>
          <p className="song-row-title">{song.title}</p>
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

      <div className="song-row-album">{song.albumTitle}</div>

      <div className="song-row-actions">
        <button className="btn-icon" aria-label={t("common.like")}>
          <IconHeart />
        </button>
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
