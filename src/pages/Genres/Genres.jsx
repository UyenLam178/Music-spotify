import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as genreService from "../../services/genreService";
import { useAuth } from "../../context/AuthContext";
import { extractErrorMessage } from "../../services/api";
import LoginPrompt from "../../components/Common/LoginPrompt";
import Loading from "../../components/Common/Loading";

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

  if (!isAuthenticated) return <LoginPrompt />;
  if (state.loading) return <Loading full />;

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>{t("genre.pageTitle")}</h1>
      <p className="sb-hint" style={{ padding: 0, marginBottom: 20 }}>{t("genre.pageSubtitle")}</p>
      {state.error && <p className="form-error-banner">{state.error}</p>}
      <div className="genre-grid">
        {state.genres.map((g) => (
          <Link key={g.id} to={`/genres/${g.id}`} className="genre-tile" style={{ background: `#${g.color}` }}>
            {g.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
