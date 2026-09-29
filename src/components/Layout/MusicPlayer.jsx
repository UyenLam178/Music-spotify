import { useTranslation } from "react-i18next";
import { usePlayer } from "../../context/PlayerContext";
import {
  IconPlay,
  IconPause,
  IconSkipNext,
  IconSkipPrev,
  IconShuffle,
  IconRepeat,
  IconVolume,
  IconVolumeMute,
  IconHeart,
} from "../Common/Icons";

const formatTime = (sec = 0) => {
  if (!Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
};

export default function MusicPlayer() {
  const { t } = useTranslation();
  const {
    currentSong,
    isPlaying,
    progress,
    duration,
    volume,
    isShuffle,
    repeatMode,
    setVolume,
    setIsShuffle,
    setRepeatMode,
    togglePlay,
    next,
    prev,
    seek,
  } = usePlayer();

  if (!currentSong) {
    return (
      <footer className="player-bar player-bar-empty">
        <span>{t("player.selectSongPrompt")}</span>
      </footer>
    );
  }

  return (
    <footer className="player-bar">
      <div className="player-now-playing">
        <img src={currentSong.coverUrl} alt={currentSong.title} className="player-cover" />
        <div className="player-track-meta">
          <span className="player-track-title">{currentSong.title}</span>
          <span className="player-track-artist">{currentSong.artistName}</span>
        </div>
        <button className="btn-icon" aria-label={t("common.like")}>
          <IconHeart />
        </button>
      </div>

      <div className="player-center">
        <div className="player-controls">
          <button
            className={`btn-icon ${isShuffle ? "control-active" : ""}`}
            onClick={() => setIsShuffle((s) => !s)}
            aria-label={t("player.shuffle")}
          >
            <IconShuffle />
          </button>
          <button className="btn-icon" onClick={prev} aria-label={t("player.previous")}>
            <IconSkipPrev />
          </button>
          <button className="btn-icon play-btn" onClick={togglePlay} aria-label={t("player.playPause")}>
            {isPlaying ? <IconPause /> : <IconPlay />}
          </button>
          <button className="btn-icon" onClick={next} aria-label={t("player.next")}>
            <IconSkipNext />
          </button>
          <button
            className={`btn-icon ${repeatMode !== "off" ? "control-active" : ""}`}
            onClick={setRepeatMode}
            aria-label={t("player.repeat")}
          >
            <IconRepeat />
            {repeatMode === "one" && <span className="repeat-one-dot">1</span>}
          </button>
        </div>
        <div className="player-progress">
          <span className="player-time">{formatTime(progress)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={progress}
            onChange={(e) => seek(Number(e.target.value))}
            className="progress-slider"
          />
          <span className="player-time">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="player-volume">
        <button className="btn-icon" onClick={() => setVolume(volume > 0 ? 0 : 0.8)}>
          {volume > 0 ? <IconVolume /> : <IconVolumeMute />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="progress-slider volume-slider"
        />
      </div>
    </footer>
  );
}
