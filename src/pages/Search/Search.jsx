import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as songService from "../../services/songService";
import SongRow from "../../components/Music/SongRow";
import AlbumCard from "../../components/Music/AlbumCard";
import ArtistCard from "../../components/Music/ArtistCard";
import Loading from "../../components/Common/Loading";

export default function Search() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const query = searchParams.get("q") || "";
    const [genres, setGenres] = useState([]);
    const [results, setResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        songService.getGenres().then(setGenres);
    }, []);

    useEffect(() => {
        if (!query.trim()) {
            setResults(null);
            return;
        }
        setIsLoading(true);
        songService
            .search(query)
            .then(setResults)
            .finally(() => setIsLoading(false));
    }, [query]);

    if (!query.trim()) {
        return (
            <div>
                <h1 style={{ fontSize: 24, marginBottom: 20 }}>{t("search.browseAll")}</h1>
                <div className="genre-grid">
                    {genres.map((g) => (
                        <div key={g.id} className="genre-tile" style={{ background: `#${g.color}` }}>
                            {g.name}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (isLoading) return <Loading full />;

    const hasResults =
        results && (results.songs.length || results.albums.length || results.artists.length);

    return (
        <div>
            <h1 style={{ fontSize: 22, marginBottom: 20 }}>
                {t("search.resultsFor")} “{query}”
            </h1>

            {!hasResults && <p className="sb-hint">{t("search.noResults")}</p>}

            {results?.songs.length > 0 && (
                <section className="section">
                    <div className="section-head">
                        <h2>{t("search.songs")}</h2>
                    </div>
                    <div className="song-list">
                        {results.songs.map((song, i) => (
                            <SongRow key={song.id} song={song} index={i} songList={results.songs} />
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

            {results?.albums.length > 0 && (
                <section className="section">
                    <div className="section-head">
                        <h2>{t("search.albums")}</h2>
                    </div>
                    <div className="card-grid">
                        {results.albums.map((album) => (
                            <AlbumCard key={album.id} album={album} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
