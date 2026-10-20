import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import * as songService from "../../services/songService";
import SongRow from "../../components/Music/SongRow";
import ArtistCard from "../../components/Music/ArtistCard";
import Loading from "../../components/Common/Loading";
import LoginPrompt from "../../components/Common/LoginPrompt";
import { extractErrorMessage } from "../../services/api";

export default function Search() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const { user, isAuthenticated } = useAuth();
    const role = user?.role;
    const query = searchParams.get("q") || "";
    const [genres, setGenres] = useState([]);
    const [results, setResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        songService.getGenres().then(setGenres);
    }, []);

    useEffect(() => {
        if (!query.trim() || !isAuthenticated) {
            setResults(null);
            setError("");
            return undefined;
        }
        let cancelled = false;
        setIsLoading(true);
        setError("");
        // Debounce: SearchBar điều hướng sau mỗi phím gõ, tránh gọi API liên tục
        const timer = setTimeout(() => {
            songService
                .search(query, { role })
                .then((r) => !cancelled && setResults(r))
                .catch((err) => {
                    if (cancelled) return;
                    setResults(null);
                    setError(extractErrorMessage(err));
                })
                .finally(() => !cancelled && setIsLoading(false));
        }, 300);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [query, role, isAuthenticated]);

    // Backend: /api/songs/** cần đăng nhập (mọi role) => khách chưa đăng nhập không tìm được
    if (query.trim() && !isAuthenticated) return <LoginPrompt />;

    if (!query.trim()) {
        return (
            <div>
                <h1 style={{ fontSize: 24, marginBottom: 20 }}>{t("search.browseAll")}</h1>
                <div className="genre-grid">
                    {genres.map((g) => (
                        <Link key={g.id} to={`/genre/${g.id}`} className="genre-tile" style={{ background: `#${g.color}` }}>
                            {g.name}
                        </Link>
                    ))}
                </div>
            </div>
        );
    }

    if (isLoading) return <Loading full />;

    const hasResults = results && (results.songs.length || results.artists.length);

    return (
        <div>
            <h1 style={{ fontSize: 22, marginBottom: 20 }}>
                {t("search.resultsFor")} “{query}”
            </h1>

            {error && <p className="form-error-banner">{error}</p>}
            {!error && !hasResults && <p className="sb-hint">{t("search.noResults")}</p>}

            {results?.songs.length > 0 && (
                <section className="section">
                    <div className="section-head">
                        <h2>{t("search.songs")}</h2>
                    </div>
                    <div className="song-list">
                        {results.songs.map((song, i) => (
                            <SongRow key={song.id} song={song} index={i} showPlays songList={results.songs} />
                        ))}
                    </div>
                </section>
            )}

            {results?.artists.length > 0 && (
                <section className="section">
                    <div className="section-head">
                        <h2>{t("search.artists")}</h2>
                    </div>
                    <div className="circle-grid">
                        {results.artists.map((artist) => (
                            <ArtistCard key={artist.id} artist={artist} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
