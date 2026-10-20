import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as genreService from "../../services/genreService";
import * as songService from "../../services/songService";
import { usePlayer } from "../../context/PlayerContext";
import { useAuth } from "../../context/AuthContext";
import { extractErrorMessage } from "../../services/api";
import LoginPrompt from "../../components/Common/LoginPrompt";
import SongRow from "../../components/Music/SongRow";
import Loading from "../../components/Common/Loading";
import Button from "../../components/Common/Button";
import { IconPlay } from "../../components/Common/Icons";

// Trang 1 thể loại: danh sách bài hát thuộc thể loại đó (kể cả bài nghệ sĩ mới tải lên đã được duyệt)
export default function Genre() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { playQueue } = usePlayer();
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState({ id: null, genre: null, songs: [], error: "" });

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;
    Promise.all([genreService.getGenreById(id), songService.getSongsByGenre(id)])
      .then(([genre, songs]) => !cancelled && setData({ id, genre, songs, error: "" }))
      .catch(async (err) => {
        const genre = await genreService.getGenreById(id);
        if (!cancelled) setData({ id, genre, songs: [], error: extractErrorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [id, isAuthenticated]);

  if (!isAuthenticated) return <LoginPrompt />;
  if (data.id !== id) return <Loading full />;
  const { genre, songs, error } = data;

  if (!genre) {
    return (
      <div className="empty-state">
        <h2>{t("genre.notFound")}</h2>
        <Link to="/search" className="btn btn-outline">{t("genre.backToBrowse")}</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="genre-hero" style={{ background: `linear-gradient(180deg, #${genre.color} 0%, transparent 100%)` }}>
        <span className="sb-section-label" style={{ padding: 0 }}>{t("search.genres")}</span>
        <h1>{genre.name}</h1>
        <p>{t("genre.songCount", { count: songs.length })}</p>
      </div>

      {error && <p className="form-error-banner">{error}</p>}

      {songs.length === 0 ? (
        <p className="sb-hint">{t("genre.empty")}</p>
      ) : (
        <>
          <div style={{ margin: "16px 0" }}>
            <Button onClick={() => playQueue(songs, 0)}>
              <IconPlay /> {t("genre.playAll")}
            </Button>
          </div>
          <div className="song-list">
            {songs.map((song, i) => (
              <SongRow key={song.id} song={song} index={i} showPlays songList={songs} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
