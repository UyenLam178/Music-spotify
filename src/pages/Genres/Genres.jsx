import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as genreService from "../../services/genreService";
import { useAuth } from "../../context/AuthContext";
import { extractErrorMessage } from "../../services/api";
import LoginPrompt from "../../components/Common/LoginPrompt";
import Loading from "../../components/Common/Loading";
import { getGenreArt } from "../../utils/genreArt";

// Trang Genres: lưới các thể loại lấy từ GET /api/genres. Bấm 1 ô -> /genres/:genreId
export default function Genres() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState({ loading: true, genres: [], error: "" });

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;
    genreService
      .getGenres()
      .then((genres) => !cancelled && setState({ loading: false, genres, error: "" }))
      .catch((err) => !cancelled && setState({ loading: false, genres: [], error: extractErrorMessage(err, t("genre.loadFailed")) }));
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, t]);

  const visible = state.genres;

  if (!isAuthenticated) return <LoginPrompt />;
  if (state.loading) return <Loading full />;

  return (
    <div className="genres-page">
      <span className="genres-arcs" aria-hidden="true" />

      <header className="genres-hero">
        <p className="genres-eyebrow">{t("genre.eyebrow")}</p>
        <h1>{t("genre.pageTitle")}</h1>
        <p className="genres-sub">{t("genre.subtitleCount", { count: state.genres.length })}</p>
      </header>

      {state.error && <p className="form-error-banner">{state.error}</p>}

      <div className="genres-grid">
        {visible.map((g) => {
          const art = getGenreArt(g.name);
          return (
            <Link
              key={g.id}
              to={`/genres/${g.id}`}
              className="genre-card"
              aria-label={t("genre.openGenre", { name: g.name })}
              style={{ "--genre-color": `#${g.color}` }}
            >
              <span
                className="genre-card-art"
                style={art ? { backgroundImage: `url(${JSON.stringify(art)})` } : undefined}
                aria-hidden="true"
              />
              <span className="genre-card-name">{g.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
