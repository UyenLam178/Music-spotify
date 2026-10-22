import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { usePlayer } from "../../context/PlayerContext";
import * as songService from "../../services/songService";
import { getLyrics, LYRICS_CHANGED_EVENT } from "../../services/lyricsService";
import { extractErrorMessage } from "../../services/api";
import { IconPlay, IconPause, IconHeadphones } from "../../components/Common/Icons";
import LikeButton from "../../components/Common/LikeButton";
import LyricsView from "../../components/Music/LyricsView";
import Loading from "../../components/Common/Loading";
import LoginPrompt from "../../components/Common/LoginPrompt";
import Button from "../../components/Common/Button";

const formatDuration = (sec = 0) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

// UC22 — Xem chi tiết bài hát + lời chạy theo nhạc
export default function Song() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { currentSong, isPlaying, progress, playSong, togglePlay, seek } = usePlayer();
  const [state, setState] = useState({ loading: true, song: null, error: "" });

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;
    songService
      .getSongById(id)
      .then((song) => !cancelled && setState({ loading: false, song, error: "" }))
      .catch((err) => !cancelled && setState({ loading: false, song: null, error: extractErrorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, [id, isAuthenticated]);

  const [lyricsEntry, setLyricsEntry] = useState({ id: null, data: null });
  const lyrics = String(lyricsEntry.id) === String(id) ? lyricsEntry.data : null;
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;
    const load = () => getLyrics(id).then((l) => !cancelled && setLyricsEntry({ id, data: l }));
    load();
    const onChanged = (e) => String(e.detail?.songId) === String(id) && load();
    window.addEventListener(LYRICS_CHANGED_EVENT, onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(LYRICS_CHANGED_EVENT, onChanged);
    };
  }, [id, isAuthenticated]);

  if (!isAuthenticated) return <LoginPrompt />;
  if (state.loading) return <Loading full />;
  if (state.error) return <p className="form-error-banner">{state.error}</p>;
  if (!state.song) {
    return (
      <div className="empty-state">
        <h2>{t("songPage.notFound")}</h2>
        <Button onClick={() => navigate("/")}>{t("common.home")}</Button>
      </div>
    );
  }

  const { song } = state;
  const isCurrent = currentSong?.id === song.id;

  const handlePlay = () => (isCurrent ? togglePlay() : playSong(song));
  // Bấm vào 1 dòng lời: đang phát bài này thì tua tới dòng đó, chưa phát thì bắt đầu phát bài
  const handleSeek = (time) => (isCurrent ? seek(time) : playSong(song));

  return (
    <div className="song-page">
      <div className="song-hero">
        <img className="song-hero-cover" src={song.coverUrl} alt={song.title} />
        <div className="song-hero-info">
          <span className="song-hero-label">{t("songPage.label")}</span>
          <h1 className="song-hero-title">{song.title}</h1>
          <p className="song-hero-artist" onClick={() => navigate(`/artist/${song.artistId}`)}>
            {song.artistName}
          </p>
          <div className="song-hero-meta">
            <span className="song-meta-item">
              <IconHeadphones /> {song.playCount.toLocaleString()} {t("songPage.plays")}
            </span>
            <span>{formatDuration(song.duration)}</span>
            {song.releaseAt && <span>{new Date(song.releaseAt).toLocaleDateString()}</span>}
            {song.albumTitle && <span>♫ {song.albumTitle}</span>}
          </div>
          <div className="song-hero-actions">
            <button className="btn-icon play-btn song-play-big" onClick={handlePlay} aria-label={t("player.playPause")}>
              {isCurrent && isPlaying ? <IconPause /> : <IconPlay />}
            </button>
            <LikeButton song={song} />
          </div>
        </div>
      </div>

      <section className="song-lyrics-section">
        <h2>{t("lyrics.title")}</h2>
        {!lyrics ? (
          <p className="sb-hint">{t("lyrics.empty")}</p>
        ) : (
          <>
            {!lyrics.synced && <p className="sb-hint">{t("lyrics.notSynced")}</p>}
            <LyricsView
              lines={lyrics.lines}
              synced={lyrics.synced}
              time={isCurrent ? progress : null}
              onSeek={handleSeek}
            />
          </>
        )}
      </section>
    </div>
  );
}
