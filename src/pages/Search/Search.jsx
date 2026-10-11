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
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get("q") || "";
    const genreId = searchParams.get("genre") || "";
    const [genreSongs, setGenreSongs] = useState(null);
    const [sort, setSort] = useState("default");
    const [genres, setGenres] = useState([]);
    const [results, setResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        songService.getGenres().then(setGenres);
    }, []);

    // Bấm vào 1 thể loại -> tải và hiển thị các bài hát thuộc thể loại đó
    useEffect(() => {
        if (!genreId) return undefined;
        let cancelled = false;
        Promise.resolve()
            .then(() => !cancelled && setGenreSongs(null))
            .then(() => songService.getSongsByGenre(genreId))
            .then((list) => !cancelled && setGenreSongs(Array.isArray(list) ? list : []));
        return () => {
            cancelled = true;
        };
    }, [genreId]);

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

    const selectGenre = (id) => setSearchParams(id ? { genre: id } : {});

    // Đang xem 1 thể loại (khi không có từ khoá tìm kiếm)
    if (!query.trim() && genreId) {
        const genre = genres.find((g) => String(g.id) === String(genreId));
        const sorted = genreSongs
            ? [...genreSongs].sort((a, b) =>
                  sort === "title"
                      ? (a.title || "").localeCompare(b.title || "")
                      : sort === "duration"
                      ? (a.duration || 0) - (b.duration || 0)
                      : 0
              )
            : null;
        return (
            <div>
                <div className="genre-chips">
                    <button onClick={() => selectGenre("")}>{t("search.allGenres")}</button>
                    {genres.map((g) => (
                        <button
                            key={g.id}
                            className={String(g.id) === String(genreId) ? "active" : ""}
                            onClick={() => selectGenre(g.id)}
                        >
                            {g.name}
                        </button>
                    ))}
                </div>
                <div className="genre-hero" style={{ background: `#${genre?.color || "535353"}` }}>
                    <h1>{genre?.name || t("search.genres")}</h1>
                    <p>{t("search.genreSongs")}</p>
                </div>
                {sorted === null ? (
                    <Loading full />
                ) : sorted.length === 0 ? (
                    <p className="sb-hint">{t("search.genreEmpty")}</p>
                ) : (
                    <>
                        <div className="sort-bar">
                            <label htmlFor="genre-sort">{t("search.sortLabel")}</label>
                            <select id="genre-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
                                <option value="default">{t("search.sortDefault")}</option>
                                <option value="title">{t("search.sortTitle")}</option>
                                <option value="duration">{t("search.sortDuration")}</option>
                            </select>
                        </div>
                        <div className="song-list">
                            {sorted.map((song, i) => (
                                <SongRow key={song.id} song={song} index={i} songList={sorted} />
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    }

    if (!query.trim()) {
        return (
            <div>
                <h1 style={{ fontSize: 24, marginBottom: 20 }}>{t("search.browseAll")}</h1>
                <div className="genre-grid">
                    {genres.map((g) => (
                        <button
                            key={g.id}
                            className="genre-tile"
                            style={{ background: `#${g.color}` }}
                            onClick={() => selectGenre(g.id)}
                        >
                            {g.name}
                        </button>
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
