import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
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
    const showGenres = searchParams.get("section") === "genres";
    const { user, isAuthenticated } = useAuth();
    const role = user?.role;
    const query = searchParams.get("q") || "";
    // Gợi ý khi chưa gõ gì: bài nghe gần đây + bài được nghe nhiều nhất
    const [suggest, setSuggest] = useState({ loading: true, recent: [], popular: [] });
    const [results, setResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!isAuthenticated || showGenres) return undefined;
        let cancelled = false;
        Promise.all([
            songService.getRecentHistory().catch(() => []),
            songService.getAllSongs().catch(() => []),
        ]).then(([recent, all]) => {
            if (cancelled) return;
            // Lịch sử có thể lặp 1 bài nhiều lần -> giữ lần nghe gần nhất của mỗi bài
            const seen = new Set();
            const uniqueRecent = recent.filter((s) => !seen.has(s.id) && seen.add(s.id)).slice(0, 8);
            const popular = [...all].filter((s) => s.playCount > 0).sort((a, b) => b.playCount - a.playCount).slice(0, 10);
            setSuggest({ loading: false, recent: uniqueRecent, popular });
        });
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, showGenres]);

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

    // Link cũ /search?section=genres -> trang Genres mới
    if (showGenres && !query.trim()) return <Navigate to="/genres" replace />;

    // Phải đăng nhập (mọi vai trò) mới tìm được => khách chưa đăng nhập thì yêu cầu đăng nhập
    if (query.trim() && !isAuthenticated) return <LoginPrompt />;

    if (!query.trim() && !showGenres) {
        if (!isAuthenticated) return <LoginPrompt />;
        if (suggest.loading) return <Loading full />;
        const { recent, popular } = suggest;
        return (
            <div>
                {recent.length > 0 && (
                    <section className="section">
                        <div className="section-head">
                            <h2>{t("search.recentSongs")}</h2>
                        </div>
                        <div className="song-list">
                            {recent.map((song, i) => (
                                <SongRow key={song.id} song={song} index={i} songList={recent} />
                            ))}
                        </div>
                    </section>
                )}
                {popular.length > 0 && (
                    <section className="section">
                        <div className="section-head">
                            <h2>{t("search.popularSongs")}</h2>
                        </div>
                        <div className="song-list">
                            {popular.map((song, i) => (
                                <SongRow key={song.id} song={song} index={i} showPlays songList={popular} />
                            ))}
                        </div>
                    </section>
                )}
                {!recent.length && !popular.length && <p className="sb-hint">{t("search.noSuggest")}</p>}
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
