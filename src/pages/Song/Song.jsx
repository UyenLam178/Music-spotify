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
import SongCard from "../../components/Music/SongCard";
import Loading from "../../components/Common/Loading";
import LoginPrompt from "../../components/Common/LoginPrompt";
import Button from "../../components/Common/Button";

// Khớp recommender.py: mỗi API gợi ý mặc định top_n = 5.
// /recommendations/artist: tối đa max_same = 3 bài cùng nghệ sĩ + bù bằng bài nghệ sĩ khác cùng thể loại cho đủ top_n.
const SIMILAR_LIMIT = 5;
const ARTIST_LIMIT = 5;

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

  // Nghệ sĩ của bài (avatar) + gợi ý bài. Gắn với id bài để không hiện nhầm dữ liệu của bài trước.
  const [extra, setExtra] = useState({ id: null, artists: [], similar: [], sameArtist: [] });
  const song = state.song;
  useEffect(() => {
    if (!isAuthenticated || !song) return undefined;
    const controller = new AbortController();
    const ignore = (err) => (err?.code === "ERR_CANCELED" ? null : []);
    Promise.all([
      songService.getArtistsOfSong(song).catch(() => []),
      recommendationService.getSimilarSongs(song.id, SIMILAR_LIMIT, controller.signal).catch(ignore),
      recommendationService.getSameArtistSongs(song.id, ARTIST_LIMIT, controller.signal).catch(ignore),
    ]).then(([artists, similar, sameArtist]) => {
      if (similar === null || sameArtist === null || controller.signal.aborted) return;
      const seen = new Set(similar.map((s) => s.id));
      setExtra({ id: song.id, artists, similar, sameArtist: sameArtist.filter((s) => !seen.has(s.id)) });
    });
    return () => controller.abort();
  }, [song, isAuthenticated]);
  const ready = song && extra.id === song.id;
  const artists = ready ? extra.artists : [];
  const similar = ready ? extra.similar : [];
  const artistRelated = ready ? extra.sameArtist : [];
  // Tách đúng như recommend_artist_db: bài cùng nghệ sĩ trước, phần bù là nghệ sĩ khác cùng thể loại
  const sameArtist = artistRelated.filter((s) => String(s.artistId) === String(song?.artistId));
  const sameGenre = artistRelated.filter((s) => String(s.artistId) !== String(song?.artistId));

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

  // Nút play lớn: phát bài này rồi nối tiếp các bài gợi ý (không trùng) thay vì dừng sau 1 bài
  const handlePlay = () => {
    if (isCurrent) return togglePlay();
    const queue = [song, ...similar, ...sameArtist, ...sameGenre].filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);
    return playSong(song, queue);
  };

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

      {similar.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>{t("songPage.recommended")}</h2>
          </div>
          <div className="song-list">
            {similar.map((s, i) => (
              <SongRow key={s.id} song={s} index={i} songList={similar} />
            ))}
          </div>
        </section>
      )}

      {sameArtist.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>{t("songPage.sameArtist")}</h2>
          </div>
          <div className="card-grid">
            {sameArtist.map((s) => (
              <SongCard key={s.id} song={s} songList={sameArtist} />
            ))}
          </div>
        </section>
      )}

      {sameGenre.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>{t("songPage.sameGenre")}</h2>
          </div>
          <div className="card-grid">
            {sameGenre.map((s) => (
              <SongCard key={s.id} song={s} songList={sameGenre} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
