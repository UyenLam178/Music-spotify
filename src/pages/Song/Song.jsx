import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { usePlayer } from "../../context/PlayerContext";
import * as songService from "../../services/songService";
import * as recommendationService from "../../services/recommendationService";
import { extractErrorMessage } from "../../services/api";
import { IconPlay, IconPause, IconHeadphones } from "../../components/Common/Icons";
import LikeButton from "../../components/Common/LikeButton";
import ArtistCard from "../../components/Music/ArtistCard";
import SongRow from "../../components/Music/SongRow";
import Loading from "../../components/Common/Loading";
import LoginPrompt from "../../components/Common/LoginPrompt";
import Button from "../../components/Common/Button";

// Khớp recommender.py: top_n = 5 (backend: tối đa 3 bài cùng nghệ sĩ + bù bài nghệ sĩ khác cùng thể loại).
const RECOMMEND_LIMIT = 5;

const formatDuration = (sec = 0) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

// UC22 — Xem chi tiết bài hát: nghệ sĩ (bấm để xem), bài hát đề xuất. Lời bài hát xem ở thanh "Đang phát".
export default function Song() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
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

  // Nghệ sĩ của bài (avatar) + gợi ý bài (theo nghệ sĩ và thể loại). Gắn với id bài để không hiện nhầm dữ liệu của bài trước.
  const [extra, setExtra] = useState({ id: null, artists: [], recs: [] });
  const song = state.song;
  useEffect(() => {
    if (!isAuthenticated || !song) return undefined;
    const controller = new AbortController();
    Promise.all([
      songService.getArtistsOfSong(song).catch(() => []),
      recommendationService.getSimilarSongs(song.id, RECOMMEND_LIMIT, controller.signal).catch((err) =>
        err?.code === "ERR_CANCELED" ? null : []
      ),
    ]).then(([artists, recs]) => {
      if (recs === null || controller.signal.aborted) return;
      setExtra({ id: song.id, artists, recs });
    });
    return () => controller.abort();
  }, [song, isAuthenticated]);
  const ready = song && extra.id === song.id;
  const artists = ready ? extra.artists : [];
  const recs = ready ? extra.recs : [];

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

  const isCurrent = currentSong?.id === song.id;

  // Nút play lớn: chỉ phát bài này. Hết bài, trình phát tự phát bài khác của cùng nghệ sĩ / nghệ sĩ hợp tác,
  // hết nữa mới chuyển sang bài cùng thể loại (xem PlayerContext).
  const handlePlay = () => (isCurrent ? togglePlay() : playSong(song));

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
            {song.genreName && song.genreId != null && (
              <Link to={`/genres/${song.genreId}`} className="genre-badge">{song.genreName}</Link>
            )}
          </div>
          <div className="song-hero-actions">
            <button className="btn-icon play-btn song-play-big" onClick={handlePlay} aria-label={t("player.playPause")}>
              {isCurrent && isPlaying ? <IconPause /> : <IconPlay />}
            </button>
            <LikeButton song={song} />
          </div>
        </div>
      </div>

      {artists.length > 0 && (
        <section className="section song-artists-section">
          <div className="section-head">
            <h2>{t("songPage.artists")}</h2>
          </div>
          <div className="card-grid">
            {artists.map((a) => (
              <ArtistCard key={a.id} artist={a} />
            ))}
          </div>
        </section>
      )}

      {recs.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>{t("songPage.recommended")}</h2>
          </div>
          <div className="song-list">
            {recs.map((s, i) => (
              <SongRow key={s.id} song={s} index={i} songList={recs} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
