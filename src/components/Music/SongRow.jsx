import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePlayer } from "../../context/PlayerContext";
import { useAuth } from "../../context/AuthContext";
import { Role } from "../../utils/enums";
import { IconPlay, IconPause, IconPlus, IconX } from "../Common/Icons";
import LikeButton from "./LikeButton";
import AddToPlaylistModal from "../Playlist/AddToPlaylistModal";

const formatDuration = (sec = 0) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
};

// onRemove (tuỳ chọn): hiện nút xoá bài khỏi playlist (dùng trong trang Playlist)
export default function SongRow({ song, index, songList, onRemove }) {
  const { t } = useTranslation();
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  // Chỉ USER và ARTIST có playlist; ADMIN thì không
  const canUsePlaylist = user?.role === Role.USER || user?.role === Role.ARTIST;
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
        <LikeButton song={song} />
        <span className="song-row-duration">{formatDuration(song.duration)}</span>
        {canUsePlaylist && (
          <button
            className="btn-icon"
            aria-label={t("common.addToPlaylist")}
            title={t("common.addToPlaylist")}
            onClick={() => setPickerOpen(true)}
          >
            <IconPlus />
          </button>
        )}
        {onRemove && (
          <button
            className="btn-icon"
            aria-label={t("playlist.removeSong")}
            title={t("playlist.removeSong")}
            onClick={() => onRemove(song)}
          >
            <IconX />
          </button>
        )}
      </div>
      {pickerOpen && <AddToPlaylistModal isOpen onClose={() => setPickerOpen(false)} song={song} />}
    </div>
  );
}
