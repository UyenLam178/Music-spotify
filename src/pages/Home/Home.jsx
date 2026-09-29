import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import * as songService from "../../services/songService";
import SongCard from "../../components/Music/SongCard";
import AlbumCard from "../../components/Music/AlbumCard";
import ArtistCard from "../../components/Music/ArtistCard";
import Loading from "../../components/Common/Loading";

export default function Home() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [data, setData] = useState(null);

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return t("home.greetingMorning");
        if (h < 18) return t("home.greetingAfternoon");
        return t("home.greetingEvening");
    };

    useEffect(() => {
        Promise.all([
            songService.getTrendingSongs(),
            songService.getNewReleases(),
            songService.getPopularArtists(),
        ]).then(([trending, releases, artists]) => setData({ trending, releases, artists }));
    }, []);

    if (!data) return <Loading full />;

    return (
        <div>
            <h1 style={{ fontSize: 28, marginBottom: 24 }}>
                {greeting()}{user ? `, ${user.fullName || user.username}` : ""}
            </h1>

            <section className="section">
                <div className="section-head">
                    <h2>{t("home.trendingSongs")}</h2>
                </div>
                <div className="card-grid">
                    {data.trending.map((song) => (
                        <SongCard key={song.id} song={song} songList={data.trending} />
                    ))}
                </div>
            </section>

            <section className="section">
                <div className="section-head">
                    <h2>{t("home.newAlbums")}</h2>
                </div>
                <div className="card-grid">
                    {data.releases.map((album) => (
                        <AlbumCard key={album.id} album={album} />
                    ))}
                </div>
            </section>

            <section className="section">
                <div className="section-head">
                    <h2>{t("home.featuredArtists")}</h2>
                </div>
                <div className="circle-grid">
                    {data.artists.map((artist) => (
                        <ArtistCard key={artist.id} artist={artist} />
                    ))}
                </div>
            </section>
        </div>
    );
}
