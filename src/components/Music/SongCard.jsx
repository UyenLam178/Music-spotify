import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePlayer } from "../../context/PlayerContext";
import { IconPlay, IconPause } from "../Common/Icons";

export default function SongCard({ song, songList }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentSong, isPlaying, playSong, togglePlay, setPanelOpen } = usePlayer();
  const isCurrent = currentSong?.id === song.id;

  const handleClick = () => {
    if (isCurrent) togglePlay();
    else playSong(song, songList);
  };

  // Bấm vào thẻ nhạc: phát bài (nếu chưa phát) và mở thanh "Đang phát" bên phải (video + lời)
  const openInPanel = () => {
    if (!isCurrent) playSong(song, songList);
    setPanelOpen(true);
  };

  return (
    <div className="media-card" onClick={openInPanel}>
      <div className="media-card-cover">
        <img src={song.coverUrl} alt={song.title} />
        <button
          className="media-card-play"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }} aria-label={t("player.play")}>
          {isCurrent && isPlaying ? <IconPause /> : <IconPlay />}
        </button>
      </div>
      <p
        className="media-card-title media-card-title-link"
        title={t("songPage.viewDetail")}
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/song/${song.id}`);
        }}
      >
        {song.title}
      </p>
      <p className="media-card-sub">{song.artistName}</p>
    </div>
  );
}
