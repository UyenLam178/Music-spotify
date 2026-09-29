import { useTranslation } from "react-i18next";
import { usePlayer } from "../../context/PlayerContext";
import { IconPlay, IconPause } from "../Common/Icons";

export default function SongCard({ song, songList }) {
  const { t } = useTranslation();
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const isCurrent = currentSong?.id === song.id;

  const handleClick = () => {
    if (isCurrent) togglePlay();
    else playSong(song, songList);
  };

  return (
    <div className="media-card">
      <div className="media-card-cover">
        <img src={song.coverUrl} alt={song.title} />
        <button className="media-card-play" onClick={handleClick} aria-label={t("player.play")}>
          {isCurrent && isPlaying ? <IconPause /> : <IconPlay />}
        </button>
      </div>
      <p className="media-card-title" title={song.title}>
        {song.title}
      </p>
      <p className="media-card-sub">{song.artistName}</p>
    </div>
  );
}
