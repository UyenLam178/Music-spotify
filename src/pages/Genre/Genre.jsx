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

const PAGE_SIZE = 20;

// Trang 1 thể loại: GET /api/songs?genreId=:genreId&page=&size= (có phân trang, đổi trang giữ nguyên genreId)
export default function Genre() {
  const { t } = useTranslation();
  const { genreId } = useParams();
  const { playQueue } = usePlayer();
  const { isAuthenticated } = useAuth();
  // pageState nhớ genreId nó thuộc về => đổi thể loại thì tự quay về trang 0
  const [pageState, setPageState] = useState({ genreId, page: 0 });
  const page = pageState.genreId === genreId ? pageState.page : 0;
  const [data, setData] = useState({ key: "", genre: null, result: null, error: "" });
  const key = `${genreId}:${page}`;

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;
    Promise.all([genreService.getGenreById(genreId), songService.getSongsByGenre(genreId, { page, size: PAGE_SIZE })])
      .then(([genre, result]) => !cancelled && setData({ key, genre, result, error: "" }))
      .catch(async (err) => {
        const genre = await genreService.getGenreById(genreId).catch(() => null);
        if (!cancelled) setData({ key, genre, result: null, error: extractErrorMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [genreId, page, key, isAuthenticated]);

  if (!isAuthenticated) return <LoginPrompt />;
  if (data.key !== key) return <Loading full />;
  const { genre, result, error } = data;

  if (!genre) {
    return (
      <div className="empty-state">
        <h2>{t("genre.notFound")}</h2>
        {error && <p className="form-error-banner">{error}</p>}
        <Link to="/genres" className="btn btn-outline">{t("genre.backToBrowse")}</Link>
      </div>
    );
  }

  const songs = result?.songs || [];
  const totalPages = result?.totalPages || 0;
  const goPage = (p) => {
    setPageState({ genreId, page: p });
    window.scrollTo?.({ top: 0 });
  };

  return (
    <div>
      <div className="genre-hero" style={{ background: `linear-gradient(180deg, #${genre.color} 0%, transparent 100%)` }}>
        <span className="sb-section-label" style={{ padding: 0 }}>{t("search.genres")}</span>
        <h1>{genre.name}</h1>
        <p>{t("genre.songCount", { count: result?.totalElements ?? 0 })}</p>
      </div>

      {error && <p className="form-error-banner">{error}</p>}

      {!error && songs.length === 0 ? (
        <p className="sb-hint">{t("genre.empty")}</p>
      ) : (
        songs.length > 0 && (
          <>
            <div style={{ margin: "16px 0" }}>
              <Button onClick={() => playQueue(songs, 0)}>
                <IconPlay /> {t("genre.playAll")}
              </Button>
            </div>
            <div className="song-list">
              {songs.map((song, i) => (
                <SongRow key={song.id} song={song} index={page * PAGE_SIZE + i} showPlays songList={songs} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="genre-pager">
                <Button size="sm" variant="outline" disabled={page <= 0} onClick={() => goPage(page - 1)}>
                  {t("genre.prev")}
                </Button>
                <span className="sb-hint">{t("genre.pageOf", { page: page + 1, total: totalPages })}</span>
                <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => goPage(page + 1)}>
                  {t("genre.next")}
                </Button>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
