import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePlayer } from "../../context/PlayerContext";
import { useAuth } from "../../context/AuthContext";
import { Role } from "../../utils/enums";
import { IconPlay, IconPause, IconPlus } from "../Common/Icons";
import LikeButton from "./LikeButton";
import AddToPlaylistModal from "../Playlist/AddToPlaylistModal";

export default function SongCard({ song, songList }) {
  const { t } = useTranslation();
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const { user } = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  const isCurrent = currentSong?.id === song.id;
  // Chỉ USER và ARTIST có playlist; ADMIN thì không
  const canUsePlaylist = user?.role === Role.USER || user?.role === Role.ARTIST;

  const handleClick = () => {
    if (isCurrent) togglePlay();
    else playSong(song, songList);
  };

  return (
    <div className="media-card">
      <div className="media-card-cover">
        <img src={song.coverUrl} alt={song.title} />
        <div className="media-card-actions">
          <LikeButton song={song} />
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
        </div>
        <button className="media-card-play" onClick={handleClick} aria-label={t("player.play")}>
          {isCurrent && isPlaying ? <IconPause /> : <IconPlay />}
        </button>
      </div>
      <p className="media-card-title" title={song.title}>
        {song.title}
      </p>
      <p className="media-card-sub">{song.artistName}</p>
      {pickerOpen && <AddToPlaylistModal isOpen onClose={() => setPickerOpen(false)} song={song} />}
    </div>
  );
}
